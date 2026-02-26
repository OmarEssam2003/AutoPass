const pool = require('../../config/db');

// Public columns — joins vehicle plate and reporting admin name
const PUBLIC_COLUMNS = `
  e.enforcement_id,
  e.vehicle_id,
  e.reported_by,
  e.reason,
  e.notes,
  e.is_active,
  e.enforced_at,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  a.first_name AS reported_by_first_name,
  a.last_name  AS reported_by_last_name,
  a.email      AS reported_by_email
`;

const BASE_JOIN = `
  FROM vehicle_enforcements e
  JOIN vehicles v ON e.vehicle_id  = v.vehicle_id
  JOIN admins  a  ON e.reported_by = a.admin_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ENFORCEMENT
// Admin enters plate number — system resolves vehicle_id automatically
// ─────────────────────────────────────────────────────────────────────────────
const createEnforcement = async (adminId, data) => {
  const { plate_number, reason, notes, is_active } = data;

  // 1. Look up vehicle by plate number
  const vehicleResult = await pool.query(
    'SELECT vehicle_id, plate_number FROM vehicles WHERE plate_number = $1',
    [plate_number.toUpperCase()]
  );

  if (!vehicleResult.rows[0]) {
    const err = new Error(
      `No vehicle found with plate number "${plate_number.toUpperCase()}". ` +
      'Please check the plate number and try again.'
    );
    err.statusCode = 404;
    throw err;
  }

  const vehicle = vehicleResult.rows[0];

  // 2. Check if an active enforcement already exists for this vehicle
  const existingCheck = await pool.query(
    `SELECT enforcement_id FROM vehicle_enforcements
     WHERE vehicle_id = $1 AND is_active = TRUE`,
    [vehicle.vehicle_id]
  );

  if (existingCheck.rows[0]) {
    const err = new Error(
      `Vehicle "${plate_number.toUpperCase()}" already has an active enforcement record. ` +
      'Deactivate the existing one before creating a new one.'
    );
    err.statusCode = 409;
    throw err;
  }

  // 3. Create the enforcement record
  const { rows } = await pool.query(
    `INSERT INTO vehicle_enforcements
       (vehicle_id, reported_by, reason, notes, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      vehicle.vehicle_id,
      adminId,
      reason,
      notes || null,
      is_active ?? true,
    ]
  );

  return {
    ...rows[0],
    plate_number: vehicle.plate_number,
    message: `Enforcement record created for vehicle ${vehicle.plate_number}.`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ENFORCEMENTS  (paginated + filters)
// ─────────────────────────────────────────────────────────────────────────────
const getAllEnforcements = async ({
  page = 1,
  limit = 20,
  plate_number,
  is_active,
  reported_by,
}) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let idx = 1;

  if (plate_number) {
    conditions.push(`v.plate_number ILIKE $${idx++}`);
    values.push(`%${plate_number}%`);
  }

  if (typeof is_active === 'boolean') {
    conditions.push(`e.is_active = $${idx++}`);
    values.push(is_active);
  }

  if (reported_by) {
    conditions.push(`e.reported_by = $${idx++}`);
    values.push(reported_by);
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
     ORDER BY e.enforced_at DESC
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
    const err = new Error('Enforcement record not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────
const updateEnforcement = async (id, data) => {
  const allowed = ['reason', 'notes', 'is_active'];
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
    `UPDATE vehicle_enforcements
     SET ${fields.join(', ')}
     WHERE enforcement_id = $${idx}
     RETURNING *`,
    values
  );

  if (!rows[0]) {
    const err = new Error('Enforcement record not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────
const deleteEnforcement = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM vehicle_enforcements
     WHERE enforcement_id = $1
     RETURNING enforcement_id`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Enforcement record not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    message:        'Enforcement record deleted successfully.',
    enforcement_id: rows[0].enforcement_id,
  };
};

module.exports = {
  createEnforcement,
  getAllEnforcements,
  getEnforcementById,
  updateEnforcement,
  deleteEnforcement,
};