const pool = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY MAP  (auto-derive priority from enforcement_type if not supplied)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PRIORITY = { STOP: 3, AUTO_BLOCK: 2, OBSERVE: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// COLUMNS & JOIN HELPERS
//
// issued_by / reported_by_user_id are mutually exclusive:
//   Admin-created  → issued_by = admin UUID,  reported_by_user_id = NULL
//   User-reported  → issued_by = NULL,         reported_by_user_id = user UUID
//
// Both JOINs are LEFT JOINs so neither side breaks the query when NULL.
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_COLUMNS = `
  e.enforcement_id,
  e.vehicle_id,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  v.vehicle_type,
  e.enforcement_type,
  e.priority,
  e.reason,
  e.notes,
  e.is_active,
  e.issued_by,
  a.first_name        AS issued_by_first_name,
  a.last_name         AS issued_by_last_name,
  e.reported_by_user_id,
  u.first_name        AS reported_by_first_name,
  u.last_name         AS reported_by_last_name,
  e.issued_at
`;

const BASE_JOIN = `
  FROM vehicle_enforcements e
  JOIN  vehicles v ON e.vehicle_id          = v.vehicle_id
  LEFT JOIN admins   a ON e.issued_by       = a.admin_id
  LEFT JOIN users    u ON e.reported_by_user_id = u.user_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ENFORCEMENT  (admin path)
//
// Business rules:
//  1. Resolve vehicle from plate_number — 404 if not found
//  2. Auto-derive priority from enforcement_type if not provided
//  3. Only one ACTIVE enforcement per vehicle — 409 otherwise
//  4. issued_by = adminId,  reported_by_user_id stays NULL
// ─────────────────────────────────────────────────────────────────────────────
const createEnforcement = async (data, adminId) => {
  const { plate_number, enforcement_type, reason, notes } = data;
  const priority = data.priority ?? DEFAULT_PRIORITY[enforcement_type];

  // 1. Resolve vehicle
  const vehicleResult = await pool.query(
    'SELECT vehicle_id FROM vehicles WHERE plate_number = $1',
    [plate_number.toUpperCase()]
  );
  if (!vehicleResult.rows[0]) {
    const err = new Error(`No vehicle found with plate number "${plate_number}".`);
    err.statusCode = 404;
    throw err;
  }
  const vehicle_id = vehicleResult.rows[0].vehicle_id;

  // 2. Check for existing active enforcement
  const existing = await pool.query(
    `SELECT enforcement_id, enforcement_type
     FROM vehicle_enforcements
     WHERE vehicle_id = $1 AND is_active = TRUE`,
    [vehicle_id]
  );
  if (existing.rows[0]) {
    const err = new Error(
      `This vehicle already has an active ${existing.rows[0].enforcement_type} enforcement. ` +
      `Deactivate it before creating a new one.`
    );
    err.statusCode = 409;
    throw err;
  }

  // 3. Insert — reported_by_user_id intentionally omitted (defaults to NULL)
  const { rows } = await pool.query(
    `INSERT INTO vehicle_enforcements
       (vehicle_id, enforcement_type, priority, reason, notes, issued_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING enforcement_id`,
    [vehicle_id, enforcement_type, priority, reason, notes || null, adminId]
  );

  return getEnforcementById(rows[0].enforcement_id);
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORT STOLEN  (user path)
//
// Business rules:
//  1. Resolve vehicle from plate_number — 404 if not found
//  2. Caller must be a VERIFIED owner of the vehicle — 403 otherwise
//  3. Only one ACTIVE enforcement per vehicle — 409 otherwise
//  4. Always creates STOP / priority 3 — highest urgency, no admin needed
//  5. issued_by = NULL  (user is not an admin)
//     reported_by_user_id = userId  (records who submitted it)
//     The DB CHECK constraint (issued_by IS NOT NULL OR reported_by_user_id IS NOT NULL)
//     is satisfied because reported_by_user_id is set.
// ─────────────────────────────────────────────────────────────────────────────
const reportStolen = async ({ plate_number, reason, notes }, userId) => {
  // 1. Resolve vehicle
  const vehicleResult = await pool.query(
    'SELECT vehicle_id FROM vehicles WHERE plate_number = $1',
    [plate_number.toUpperCase()]
  );
  if (!vehicleResult.rows[0]) {
    const err = new Error(`No vehicle found with plate number "${plate_number}".`);
    err.statusCode = 404;
    throw err;
  }
  const vehicle_id = vehicleResult.rows[0].vehicle_id;

  // 2. Verify the caller is a verified owner
  const ownerCheck = await pool.query(
    `SELECT ownership_id
     FROM vehicle_ownerships
     WHERE vehicle_id = $1 AND user_id = $2 AND verified = TRUE`,
    [vehicle_id, userId]
  );
  if (!ownerCheck.rows[0]) {
    const err = new Error('You are not a verified owner of this vehicle.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Check for existing active enforcement
  const existing = await pool.query(
    `SELECT enforcement_id, enforcement_type
     FROM vehicle_enforcements
     WHERE vehicle_id = $1 AND is_active = TRUE`,
    [vehicle_id]
  );
  if (existing.rows[0]) {
    const err = new Error(
      `This vehicle already has an active ${existing.rows[0].enforcement_type} enforcement.`
    );
    err.statusCode = 409;
    throw err;
  }

  // 4. Insert — issued_by is explicitly NULL (user is not an admin)
  const { rows } = await pool.query(
    `INSERT INTO vehicle_enforcements
       (vehicle_id, enforcement_type, priority, reason, notes, issued_by, reported_by_user_id)
     VALUES ($1, 'STOP', 3, $2, $3, NULL, $4)
     RETURNING enforcement_id`,
    [vehicle_id, reason, notes || null, userId]
  );

  return getEnforcementById(rows[0].enforcement_id);
};

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW STOLEN REPORT  (user path)
//
// Business rules:
//  1. Enforcement must exist — 404 otherwise
//  2. reported_by_user_id must match the caller — 403 otherwise
//     (users cannot withdraw admin-created enforcements)
//  3. Must still be active — 409 if already withdrawn/deactivated
//  4. Sets is_active = FALSE — record preserved for audit history
// ─────────────────────────────────────────────────────────────────────────────
const withdrawStolenReport = async (enforcementId, userId) => {
  const { rows } = await pool.query(
    `SELECT enforcement_id, is_active, reported_by_user_id
     FROM vehicle_enforcements
     WHERE enforcement_id = $1`,
    [enforcementId]
  );
  if (!rows[0]) {
    const err = new Error('Enforcement not found.');
    err.statusCode = 404;
    throw err;
  }
  const record = rows[0];

  // Must be the user who reported it
  if (!record.reported_by_user_id || record.reported_by_user_id !== userId) {
    const err = new Error('You can only withdraw stolen reports that you submitted.');
    err.statusCode = 403;
    throw err;
  }

  // Must still be active
  if (!record.is_active) {
    const err = new Error('This stolen report has already been withdrawn or deactivated.');
    err.statusCode = 409;
    throw err;
  }

  await pool.query(
    `UPDATE vehicle_enforcements SET is_active = FALSE WHERE enforcement_id = $1`,
    [enforcementId]
  );

  return getEnforcementById(enforcementId);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY STOLEN REPORTS  (user path)
// Returns all enforcements the calling user self-reported (active and inactive)
// ─────────────────────────────────────────────────────────────────────────────
const getMyStolenReports = async (userId, { page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) ${BASE_JOIN} WHERE e.reported_by_user_id = $1`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     ${BASE_JOIN}
     WHERE e.reported_by_user_id = $1
     ORDER BY e.issued_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ENFORCEMENTS  (admin path)
// user_reported filter: true = user-submitted only, false = admin-created only
// ─────────────────────────────────────────────────────────────────────────────
const getAllEnforcements = async ({
  page = 1, limit = 20,
  plate_number, enforcement_type, is_active, issued_by, priority, user_reported,
}) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (plate_number) {
    conditions.push(`v.plate_number = $${idx++}`);
    values.push(plate_number.toUpperCase());
  }
  if (enforcement_type) {
    conditions.push(`e.enforcement_type = $${idx++}`);
    values.push(enforcement_type);
  }
  if (typeof is_active === 'boolean') {
    conditions.push(`e.is_active = $${idx++}`);
    values.push(is_active);
  }
  if (issued_by) {
    conditions.push(`e.issued_by = $${idx++}`);
    values.push(issued_by);
  }
  if (priority) {
    conditions.push(`e.priority = $${idx++}`);
    values.push(priority);
  }
  if (user_reported === true)  conditions.push(`e.reported_by_user_id IS NOT NULL`);
  if (user_reported === false) conditions.push(`e.reported_by_user_id IS NULL`);

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
     ORDER BY e.priority DESC, e.issued_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ENFORCEMENT BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getEnforcementById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE e.enforcement_id = $1`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Enforcement not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ENFORCEMENT  (admin path)
// ─────────────────────────────────────────────────────────────────────────────
const updateEnforcement = async (id, data) => {
  await getEnforcementById(id); // 404 guard

  const allowed = ['enforcement_type', 'priority', 'reason', 'notes', 'is_active'];
  const fields  = [];
  const values  = [];
  let   idx     = 1;

  const update = { ...data };

  if (update.enforcement_type && !update.priority) {
    update.priority = DEFAULT_PRIORITY[update.enforcement_type];
  }

  for (const key of allowed) {
    if (key in update) {
      fields.push(`${key} = $${idx++}`);
      values.push(update[key]);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 400;
    throw err;
  }

  values.push(id);
  await pool.query(
    `UPDATE vehicle_enforcements SET ${fields.join(', ')} WHERE enforcement_id = $${idx}`,
    values
  );

  return getEnforcementById(id);
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ENFORCEMENT  (admin path)
// ─────────────────────────────────────────────────────────────────────────────
const deleteEnforcement = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM vehicle_enforcements WHERE enforcement_id = $1 RETURNING enforcement_id',
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Enforcement not found.');
    err.statusCode = 404;
    throw err;
  }
  return {
    message:        'Enforcement deleted successfully.',
    enforcement_id: rows[0].enforcement_id,
  };
};

module.exports = {
  createEnforcement,
  reportStolen,
  withdrawStolenReport,
  getMyStolenReports,
  getAllEnforcements,
  getEnforcementById,
  updateEnforcement,
  deleteEnforcement,
};
