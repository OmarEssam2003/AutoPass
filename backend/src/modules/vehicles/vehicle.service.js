const pool = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE VEHICLE
// ─────────────────────────────────────────────────────────────────────────────
const createVehicle = async (data) => {
  const {
    plate_number,
    vehicle_type,
    make,
    model,
    color,
    owner_phone_number,
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO vehicles
       (plate_number, vehicle_type, make, model, color, owner_phone_number)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      plate_number.toUpperCase(),   // normalize plate to uppercase
      vehicle_type   || null,
      make           || null,
      model          || null,
      color          || null,
      owner_phone_number,
    ]
  );

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL VEHICLES  (paginated + all filters)
// Only admins hit this — users use GET /vehicles/:id for their own vehicle
// ─────────────────────────────────────────────────────────────────────────────
const getAllVehicles = async ({
  page = 1,
  limit = 20,
  vehicle_type,
  make,
  color,
  plate_number,
  owner_phone_number,
}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (vehicle_type) {
    conditions.push(`vehicle_type ILIKE $${idx++}`);
    values.push(`%${vehicle_type}%`);
  }

  if (make) {
    conditions.push(`make ILIKE $${idx++}`);
    values.push(`%${make}%`);
  }

  if (color) {
    conditions.push(`color ILIKE $${idx++}`);
    values.push(`%${color}%`);
  }

  if (plate_number) {
    conditions.push(`plate_number ILIKE $${idx++}`);
    values.push(`%${plate_number}%`);
  }

  if (owner_phone_number) {
    conditions.push(`owner_phone_number ILIKE $${idx++}`);
    values.push(`%${owner_phone_number}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM vehicles ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT * FROM vehicles
     ${where}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET VEHICLE BY ID
// Admins can fetch any vehicle.
// Users can only fetch vehicles they own (checked via vehicle_ownerships).
// ─────────────────────────────────────────────────────────────────────────────
const getVehicleById = async (id, requester) => {
  // If the requester is a regular user, verify they own this vehicle
  if (requester.type === 'user') {
    const ownershipCheck = await pool.query(
      `SELECT ownership_id FROM vehicle_ownerships
       WHERE vehicle_id = $1 AND user_id = $2 AND verified = TRUE`,
      [id, requester.id]
    );

    if (!ownershipCheck.rows[0]) {
      const err = new Error('Forbidden. You do not own this vehicle.');
      err.statusCode = 403;
      throw err;
    }
  }

  const { rows } = await pool.query(
    `SELECT * FROM vehicles WHERE vehicle_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE VEHICLE
// ─────────────────────────────────────────────────────────────────────────────
const updateVehicle = async (id, data) => {
  const allowed = [
    'plate_number', 'vehicle_type', 'make',
    'model', 'color', 'owner_phone_number',
  ];

  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx++}`);
      // normalize plate number to uppercase if being updated
      values.push(key === 'plate_number' ? data[key].toUpperCase() : data[key]);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 400;
    throw err;
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE vehicles
     SET ${fields.join(', ')}
     WHERE vehicle_id = $${idx}
     RETURNING *`,
    values
  );

  if (!rows[0]) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE VEHICLE
// ─────────────────────────────────────────────────────────────────────────────
const deleteVehicle = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM vehicles WHERE vehicle_id = $1 RETURNING vehicle_id`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Vehicle deleted successfully.', vehicle_id: rows[0].vehicle_id };
};

module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};