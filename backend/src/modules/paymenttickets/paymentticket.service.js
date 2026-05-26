const pool = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GET PAYMENT BY TICKET ID
//
// Answers: "which payment covered this ticket?"
// Returns the payment record + all other tickets covered in the same payment.
// Useful for showing a user their receipt for a specific ticket.
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentByTicketId = async (ticketId) => {
  // 1. Confirm ticket exists
  const ticketCheck = await pool.query(
    `SELECT ticket_id, status, price, vehicle_id
     FROM tickets WHERE ticket_id = $1`,
    [ticketId]
  );
  if (!ticketCheck.rows[0]) {
    const err = new Error('Ticket not found.');
    err.statusCode = 404;
    throw err;
  }

  // 2. Find the payment that covers this ticket (via junction table)
  const junctionResult = await pool.query(
    `SELECT pt.payment_id
     FROM payment_tickets pt
     WHERE pt.ticket_id = $1
     LIMIT 1`,
    [ticketId]
  );

  if (!junctionResult.rows[0]) {
    const err = new Error('No payment found for this ticket. It may still be unpaid.');
    err.statusCode = 404;
    throw err;
  }

  const paymentId = junctionResult.rows[0].payment_id;

  // 3. Fetch full payment record
  const paymentResult = await pool.query(
    `SELECT
       p.payment_id,
       p.user_id,
       u.first_name,
       u.last_name,
       u.email,
       p.amount,
       p.payment_method,
       p.status,
       p.paid_at
     FROM payments p
     LEFT JOIN users u ON p.user_id = u.user_id
     WHERE p.payment_id = $1`,
    [paymentId]
  );

  // 4. Fetch all tickets covered by this payment (full breakdown)
  const ticketsResult = await pool.query(
    `SELECT
       t.ticket_id,
       t.price,
       t.status,
       t.issued_at,
       t.direction,
       v.plate_number,
       v.make,
       v.model,
       g.location_name  AS gate_name,
       g.direction      AS gate_direction,
       z.zone_name
     FROM payment_tickets pt
     JOIN tickets  t  ON pt.ticket_id  = t.ticket_id
     JOIN vehicles v  ON t.vehicle_id  = v.vehicle_id
     LEFT JOIN gates g ON t.gate_id    = g.gate_id
     LEFT JOIN zones z ON t.zone_id    = z.zone_id
     WHERE pt.payment_id = $1
     ORDER BY t.issued_at DESC`,
    [paymentId]
  );

  return {
    ...paymentResult.rows[0],
    tickets:       ticketsResult.rows,
    ticket_count:  ticketsResult.rows.length,
    queried_ticket_id: ticketId,
  };
};

module.exports = { getPaymentByTicketId };