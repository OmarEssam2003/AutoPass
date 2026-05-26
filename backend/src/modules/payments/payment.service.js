const pool = require('../../config/db');

const PUBLIC_COLUMNS = `
  p.payment_id,
  p.user_id,
  u.first_name,
  u.last_name,
  u.email,
  p.amount,
  p.payment_method,
  p.status,
  p.paid_at
`;

const BASE_JOIN = `
  FROM payments p
  LEFT JOIN users u ON p.user_id = u.user_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — fetch ticket IDs linked to a payment
// ─────────────────────────────────────────────────────────────────────────────
const getLinkedTicketIds = async (paymentId) => {
  const { rows } = await pool.query(
    'SELECT ticket_id FROM payment_tickets WHERE payment_id = $1',
    [paymentId]
  );
  return rows.map(r => r.ticket_id);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — build a full payment response with ticket_ids
// ─────────────────────────────────────────────────────────────────────────────
const buildPaymentResponse = async (paymentId) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE p.payment_id = $1`,
    [paymentId]
  );
  if (!rows[0]) {
    const err = new Error('Payment not found.');
    err.statusCode = 404;
    throw err;
  }
  const ticket_ids = await getLinkedTicketIds(paymentId);
  return { ...rows[0], ticket_ids };
};

const getMyPayments = async (userId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;

  const { rows: payments } = await pool.query(
    `SELECT p.payment_id, p.user_id, p.amount, p.payment_method, 
          p.status, p.paid_at,
          COALESCE(
            array_agg(pt.ticket_id) FILTER (WHERE pt.ticket_id IS NOT NULL),
            '{}'
          ) AS ticket_ids
   FROM payments p
   LEFT JOIN payment_tickets pt ON pt.payment_id = p.payment_id
   WHERE p.user_id = $1
   GROUP BY p.payment_id
   ORDER BY p.paid_at DESC
   LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM payments WHERE user_id = $1`,
    [userId]
  );

  const total = parseInt(countRows[0].count, 10);

  return {
    data: payments,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PAY SINGLE TICKET  (user JWT)
//
// Business rules:
//  1. Ticket must belong to the authenticated user (charged_user_id)
//  2. Ticket must be UNPAID
//  3. Ticket must have a price set
//  4. All DB writes wrapped in a transaction — payment + junction + ticket update
// ─────────────────────────────────────────────────────────────────────────────
const payTicket = async (userId, { ticket_id, payment_method }) => {
  const client = await pool.connect();

  try {
    console.log("payment api")
    await client.query('BEGIN');

    // 1. Fetch ticket and validate ownership + state
    const ticketResult = await client.query(
      `SELECT t.ticket_id, t.charged_user_id, t.status, t.price,
              v.plate_number
       FROM tickets t
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id
       WHERE t.ticket_id = $1`,
      [ticket_id]
    );

    const ticket = ticketResult.rows[0];
    console.log(ticket)
    if (!ticket) {
      const err = new Error('Ticket not found.');
      err.statusCode = 404;
      throw err;
    }
    if (ticket.charged_user_id !== userId) {
      const err = new Error('This ticket is not assigned to your account.');
      err.statusCode = 403;
      throw err;
    }
    if (ticket.status !== 'UNPAID') {
      const err = new Error(`Cannot pay a ticket with status "${ticket.status}".`);
      err.statusCode = 409;
      throw err;
    }
    if (!ticket.price || parseFloat(ticket.price) <= 0) {
      const err = new Error('This ticket has no price set. Contact support.');
      err.statusCode = 409;
      throw err;
    }

    const amount = parseFloat(ticket.price);

    // 2. Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (user_id, amount, payment_method, status)
       VALUES ($1, $2, $3, 'COMPLETED')
       RETURNING payment_id`,
      [userId, amount, payment_method || 'MOBILE_APP']
    );
    const payment_id = paymentResult.rows[0].payment_id;

    // 3. Link ticket to payment via junction table
    await client.query(
      'INSERT INTO payment_tickets (payment_id, ticket_id) VALUES ($1, $2)',
      [payment_id, ticket_id]
    );

    // 4. Mark ticket as PAID
    await client.query(
      `UPDATE tickets SET status = 'PAID' WHERE ticket_id = $1`,
      [ticket_id]
    );

    await client.query('COMMIT');

    // Build and return full response
    const payment = await buildPaymentResponse(payment_id);

    return {
      payment,
      total_amount: amount,
      message: `Ticket paid successfully. Total charged: ${amount.toFixed(2)} EGP.`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PAY ALL UNPAID TICKETS FOR A VEHICLE  (user JWT)
//
// Business rules:
//  1. User must be the charged_user_id on all tickets (only their tickets paid)
//  2. Only UNPAID tickets with a price are included
//  3. At least one eligible ticket must exist
//  4. All writes wrapped in a single transaction
// ─────────────────────────────────────────────────────────────────────────────
const payAll = async (userId, { vehicle_id, payment_method }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch all eligible tickets for this user + vehicle
    const ticketResult = await client.query(
      `SELECT ticket_id, price
       FROM tickets
       WHERE vehicle_id      = $1
         AND charged_user_id = $2
         AND status          = 'UNPAID'
         AND price           IS NOT NULL
         AND price           > 0`,
      [vehicle_id, userId]
    );

    const tickets = ticketResult.rows;

    if (tickets.length === 0) {
      const err = new Error('No unpaid tickets found for this vehicle assigned to your account.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Calculate total
    const totalAmount = tickets.reduce((sum, t) => sum + parseFloat(t.price), 0);

    // 3. Create one payment record for the batch
    const paymentResult = await client.query(
      `INSERT INTO payments (user_id, amount, payment_method, status)
       VALUES ($1, $2, $3, 'COMPLETED')
       RETURNING payment_id`,
      [userId, totalAmount, payment_method || 'MOBILE_APP']
    );
    const payment_id = paymentResult.rows[0].payment_id;

    // 4. Link all tickets to the payment + mark each as PAID
    for (const ticket of tickets) {
      await client.query(
        'INSERT INTO payment_tickets (payment_id, ticket_id) VALUES ($1, $2)',
        [payment_id, ticket.ticket_id]
      );
      await client.query(
        `UPDATE tickets SET status = 'PAID' WHERE ticket_id = $1`,
        [ticket.ticket_id]
      );
    }

    await client.query('COMMIT');

    const payment = await buildPaymentResponse(payment_id);

    return {
      payment,
      total_amount: totalAmount,
      ticket_count: tickets.length,
      message: `All ${tickets.length} ticket(s) paid successfully. Total charged: ${totalAmount.toFixed(2)} EGP.`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REFUND  (SUPER_ADMIN only)
//
// Business rules:
//  1. Payment must be COMPLETED — cannot refund FAILED or already REFUNDED
//  2. All linked tickets are set back to UNPAID
//  3. Payment status set to REFUNDED
//  4. All writes in a transaction
// ─────────────────────────────────────────────────────────────────────────────
const refundPayment = async (paymentId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch payment and validate state
    const paymentResult = await client.query(
      'SELECT payment_id, status, amount FROM payments WHERE payment_id = $1',
      [paymentId]
    );
    const payment = paymentResult.rows[0];

    if (!payment) {
      const err = new Error('Payment not found.');
      err.statusCode = 404;
      throw err;
    }
    if (payment.status !== 'COMPLETED') {
      const err = new Error(`Cannot refund a payment with status "${payment.status}".`);
      err.statusCode = 409;
      throw err;
    }

    // 2. Get linked ticket IDs
    const ticketIds = await getLinkedTicketIds(paymentId);

    // 3. Set all linked tickets back to UNPAID
    if (ticketIds.length > 0) {
      await client.query(
        `UPDATE tickets SET status = 'UNPAID'
         WHERE ticket_id = ANY($1::uuid[])`,
        [ticketIds]
      );
    }

    // 4. Mark payment as REFUNDED
    await client.query(
      `UPDATE payments SET status = 'REFUNDED' WHERE payment_id = $1`,
      [paymentId]
    );

    await client.query('COMMIT');

    const result = await buildPaymentResponse(paymentId);

    return {
      payment: result,
      message: `Payment refunded. ${ticketIds.length} ticket(s) set back to UNPAID.`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PAYMENTS  (admin)
// ─────────────────────────────────────────────────────────────────────────────
const getAllPayments = async ({ page = 1, limit = 20, user_id, status, from, to }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (user_id) {
    conditions.push(`p.user_id = $${idx++}`);
    values.push(user_id);
  }
  if (status) {
    conditions.push(`p.status = $${idx++}`);
    values.push(status);
  }
  if (from) {
    conditions.push(`p.paid_at >= $${idx++}`);
    values.push(new Date(from));
  }
  if (to) {
    conditions.push(`p.paid_at <= $${idx++}`);
    values.push(new Date(to));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) ${BASE_JOIN} ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     ${BASE_JOIN}
     ${where}
     ORDER BY p.paid_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  // Attach ticket_ids to each payment
  const data = await Promise.all(
    rows.map(async (row) => {
      const ticket_ids = await getLinkedTicketIds(row.payment_id);
      return { ...row, ticket_ids };
    })
  );

  return {
    data,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PAYMENT BY ID  (admin — full detail with ticket breakdown)
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE p.payment_id = $1`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Payment not found.');
    err.statusCode = 404;
    throw err;
  }

  // Fetch full ticket detail for breakdown
  const ticketResult = await pool.query(
    `SELECT t.ticket_id, t.price, t.status, v.plate_number,
            g.location_name AS gate_name, z.zone_name, t.issued_at
     FROM payment_tickets pt
     JOIN tickets  t ON pt.ticket_id  = t.ticket_id
     JOIN vehicles v ON t.vehicle_id  = v.vehicle_id
     LEFT JOIN gates g ON t.gate_id   = g.gate_id
     LEFT JOIN zones z ON t.zone_id   = z.zone_id
     WHERE pt.payment_id = $1`,
    [id]
  );

  return { ...rows[0], tickets: ticketResult.rows };
};

module.exports = {
  payTicket,
  payAll,
  refundPayment,
  getAllPayments,
  getPaymentById,
  getMyPayments,   // ← ADD THIS
};