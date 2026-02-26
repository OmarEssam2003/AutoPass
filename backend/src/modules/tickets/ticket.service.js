const pool = require('../../config/db');

const PUBLIC_COLUMNS = `
  t.ticket_id,
  t.event_id,
  t.vehicle_id,
  t.rule_id,
  t.rental_id,
  t.charged_user_id,
  t.charged_as,
  t.enforcement_id,
  t.status,
  t.amount,
  t.created_at,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  v.vehicle_type,
  u.first_name  AS charged_user_first_name,
  u.last_name   AS charged_user_last_name,
  u.email       AS charged_user_email,
  pr.rate_per_hour,
  pr.max_daily_cap,
  z.zone_name
`;

const BASE_JOIN = `
  FROM tickets t
  JOIN vehicles v          ON t.vehicle_id      = v.vehicle_id
  LEFT JOIN users u        ON t.charged_user_id = u.user_id
  LEFT JOIN pricing_rules pr ON t.rule_id       = pr.rule_id
  LEFT JOIN zones z        ON pr.zone_id        = z.zone_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL TICKETS
// Admins → all tickets with filters
// Users  → only their own tickets (scoped by charged_user_id)
// ─────────────────────────────────────────────────────────────────────────────
const getAllTickets = async (
  { page = 1, limit = 20, status, charged_user_id, vehicle_id, charged_as, from, to },
  requester
) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let idx = 1;

  // Users always scoped to their own tickets
  if (requester.type === 'user') {
    conditions.push(`t.charged_user_id = $${idx++}`);
    values.push(requester.id);
  } else {
    // Admins can filter by any user
    if (charged_user_id) {
      conditions.push(`t.charged_user_id = $${idx++}`);
      values.push(charged_user_id);
    }
  }

  if (status) {
    conditions.push(`t.status = $${idx++}`);
    values.push(status);
  }

  if (vehicle_id) {
    conditions.push(`t.vehicle_id = $${idx++}`);
    values.push(vehicle_id);
  }

  if (charged_as) {
    conditions.push(`t.charged_as = $${idx++}`);
    values.push(charged_as);
  }

  if (from) {
    conditions.push(`t.created_at >= $${idx++}`);
    values.push(new Date(from));
  }

  if (to) {
    conditions.push(`t.created_at <= $${idx++}`);
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
     ORDER BY t.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TICKET BY ID
// Admins → any ticket
// Users  → only their own
// ─────────────────────────────────────────────────────────────────────────────
const getTicketById = async (id, requester) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE t.ticket_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Ticket not found.');
    err.statusCode = 404;
    throw err;
  }

  // Users can only view their own tickets
  if (requester.type === 'user' && rows[0].charged_user_id !== requester.id) {
    const err = new Error('Forbidden. This ticket does not belong to you.');
    err.statusCode = 403;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// PAY TICKET  (called by the user from the mobile app)
//
// Calculates the final amount using the pricing rule, then marks as PAID
// and auto-creates a payment record.
// ─────────────────────────────────────────────────────────────────────────────
const payTicket = async (ticketId, userId) => {
  // 1. Fetch the ticket
  const { rows } = await pool.query(
    `SELECT t.*, pr.rate_per_hour, pr.max_daily_cap, de.detected_at
     FROM tickets t
     LEFT JOIN pricing_rules pr  ON t.rule_id  = pr.rule_id
     LEFT JOIN detection_events de ON t.event_id = de.event_id
     WHERE t.ticket_id = $1`,
    [ticketId]
  );

  if (!rows[0]) {
    const err = new Error('Ticket not found.');
    err.statusCode = 404;
    throw err;
  }

  const ticket = rows[0];

  // 2. Verify this ticket belongs to the requesting user
  if (ticket.charged_user_id !== userId) {
    const err = new Error('Forbidden. This ticket does not belong to you.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Can only pay UNPAID tickets
  if (ticket.status !== 'UNPAID') {
    const err = new Error(
      `Ticket cannot be paid — current status is "${ticket.status}".`
    );
    err.statusCode = 409;
    throw err;
  }

  // 4. Calculate amount if not already set
  //    Simple calculation: rate_per_hour × hours since detection (capped at max_daily_cap)
  let amount = ticket.amount;
  if (!amount && ticket.rate_per_hour) {
    const detectedAt  = new Date(ticket.detected_at);
    const now         = new Date();
    const hoursElapsed = Math.max(
      1, // minimum 1 hour charge
      Math.ceil((now - detectedAt) / (1000 * 60 * 60))
    );
    amount = parseFloat(ticket.rate_per_hour) * hoursElapsed;

    // Apply daily cap if set
    if (ticket.max_daily_cap && amount > parseFloat(ticket.max_daily_cap)) {
      amount = parseFloat(ticket.max_daily_cap);
    }

    amount = parseFloat(amount.toFixed(2));
  }

  // 5. Mark ticket as PAID and set amount in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: updated } = await client.query(
      `UPDATE tickets
       SET status = 'PAID', amount = $1
       WHERE ticket_id = $2
       RETURNING *`,
      [amount, ticketId]
    );

    // 6. Auto-create a payment record
    const { rows: payment } = await client.query(
      `INSERT INTO payments (ticket_id, user_id, amount, payment_method, status)
       VALUES ($1, $2, $3, 'MOBILE_APP', 'COMPLETED')
       RETURNING *`,
      [ticketId, userId, amount]
    );

    await client.query('COMMIT');

    return {
      ticket:  updated[0],
      payment: payment[0],
      message: `Ticket paid successfully. Amount charged: ${amount} EGP.`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TICKET  (admin manual override — status correction, amount fix)
// ─────────────────────────────────────────────────────────────────────────────
const updateTicket = async (id, data) => {
  const allowed = ['status', 'amount'];
  const fields  = [];
  const values  = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 400;
    throw err;
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE tickets SET ${fields.join(', ')} WHERE ticket_id = $${idx} RETURNING *`,
    values
  );

  if (!rows[0]) {
    const err = new Error('Ticket not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE TICKET  (SUPER_ADMIN + FINANCE_ADMIN — API only, not in dashboard)
// ─────────────────────────────────────────────────────────────────────────────
const deleteTicket = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM tickets WHERE ticket_id = $1 RETURNING ticket_id',
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Ticket not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    message:   'Ticket deleted successfully.',
    ticket_id: rows[0].ticket_id,
  };
};

module.exports = {
  getAllTickets,
  getTicketById,
  payTicket,
  updateTicket,
  deleteTicket,
};