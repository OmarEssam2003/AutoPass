const pool = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Tickets are auto-created by the detection pipeline.
// The admin API is:
//   GET list      → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//   GET by ID     → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//   PUT           → SUPER_ADMIN only  (manual override: status, price, charge assignment)
//   DELETE        → SUPER_ADMIN only  (blocked if paid)
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_COLUMNS = `
  t.ticket_id,
  t.event_id,
  t.vehicle_id,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  v.vehicle_type,
  t.rule_id,
  t.rental_id,
  t.charged_user_id,
  u.first_name        AS charged_user_first_name,
  u.last_name         AS charged_user_last_name,
  u.email             AS charged_user_email,
  t.charged_as,
  t.gate_id,
  g.location_name     AS gate_name,
  g.direction         AS gate_direction,
  t.zone_id,
  z.zone_name,
  t.direction,
  t.price,
  t.status,
  t.issued_at
`;

const BASE_JOIN = `
  FROM tickets t
  JOIN      vehicles  v ON t.vehicle_id      = v.vehicle_id
  LEFT JOIN users     u ON t.charged_user_id = u.user_id
  LEFT JOIN gates     g ON t.gate_id         = g.gate_id
  LEFT JOIN zones     z ON t.zone_id         = z.zone_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL TICKETS
// ─────────────────────────────────────────────────────────────────────────────
const getAllTickets = async ({
  page = 1, limit = 20,
  vehicle_id, plate_number,
  charged_user_id, status, charged_as,
  zone_id, gate_id,
  from, to,
}) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  // vehicle_id takes priority over plate_number if both sent
  if (vehicle_id) {
    conditions.push(`t.vehicle_id = $${idx++}`);
    values.push(vehicle_id);
  } else if (plate_number) {
    conditions.push(`v.plate_number = $${idx++}`);
    values.push(plate_number.toUpperCase());
  }

  if (charged_user_id) {
    conditions.push(`t.charged_user_id = $${idx++}`);
    values.push(charged_user_id);
  }

  if (status) {
    conditions.push(`t.status = $${idx++}`);
    values.push(status);
  }

  if (charged_as) {
    conditions.push(`t.charged_as = $${idx++}`);
    values.push(charged_as);
  }

  if (zone_id) {
    conditions.push(`t.zone_id = $${idx++}`);
    values.push(zone_id);
  }

  if (gate_id) {
    conditions.push(`t.gate_id = $${idx++}`);
    values.push(gate_id);
  }

  if (from) {
    conditions.push(`t.issued_at >= $${idx++}`);
    values.push(new Date(from));
  }

  if (to) {
    conditions.push(`t.issued_at <= $${idx++}`);
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
     ORDER BY t.issued_at DESC
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
// ─────────────────────────────────────────────────────────────────────────────
const getTicketById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE t.ticket_id = $1`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Ticket not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TICKET  (SUPER_ADMIN only — manual override)
//
// Allowed fields: status, price, charged_user_id, charged_as
//
// Business rules:
//  - Cannot change status of a PAID ticket back to UNPAID
//  - Cannot change status of a CANCELLED ticket
// ─────────────────────────────────────────────────────────────────────────────
const updateTicket = async (id, data) => {
  const current = await getTicketById(id);

  // Guard: cannot un-pay a ticket
  if (current.status === 'PAID' && data.status && data.status !== 'PAID') {
    const err = new Error(
      'Cannot change the status of a PAID ticket. Issue a refund via the payments module instead.'
    );
    err.statusCode = 409;
    throw err;
  }

  // Guard: cannot modify a cancelled ticket
  if (current.status === 'CANCELLED' && data.status !== 'CANCELLED') {
    const err = new Error('Cannot modify a CANCELLED ticket.');
    err.statusCode = 409;
    throw err;
  }

  const allowed = ['status', 'price', 'charged_user_id', 'charged_as'];
  const fields  = [];
  const values  = [];
  let   idx     = 1;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key] ?? null);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 400;
    throw err;
  }

  values.push(id);

  await pool.query(
    `UPDATE tickets SET ${fields.join(', ')} WHERE ticket_id = $${idx}`,
    values
  );

  return getTicketById(id);
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE TICKET  (SUPER_ADMIN only)
//
// Blocked if ticket is PAID — paid tickets are financial records.
// Linked payment_tickets rows cascade automatically on delete.
// ─────────────────────────────────────────────────────────────────────────────
const deleteTicket = async (id) => {
  const current = await getTicketById(id);

  if (current.status === 'PAID') {
    const err = new Error(
      'Cannot delete a PAID ticket — it is a financial record. Cancel it instead.'
    );
    err.statusCode = 409;
    throw err;
  }

  await pool.query('DELETE FROM tickets WHERE ticket_id = $1', [id]);

  return {
    message:   'Ticket deleted successfully.',
    ticket_id: id,
  };
};

module.exports = {
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
};
