const pool = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE GATE
// ─────────────────────────────────────────────────────────────────────────────
const createGate = async (data) => {
  const { location_name, direction, zone_id, device_serial, is_active } = data;

  // Validate that zone_id exists if provided
  if (zone_id) {
    const zoneCheck = await pool.query(
      'SELECT zone_id FROM zones WHERE zone_id = $1',
      [zone_id]
    );
    if (!zoneCheck.rows[0]) {
      const err = new Error('Zone not found. Please provide a valid zone_id.');
      err.statusCode = 404;
      throw err;
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO gates (location_name, direction, zone_id, device_serial, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [location_name, direction, zone_id || null, device_serial || null, is_active ?? true]
  );

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL GATES  (paginated + all filters)
// ─────────────────────────────────────────────────────────────────────────────
const getAllGates = async ({ page = 1, limit = 20, zone_id, direction, is_active, device_serial, search }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (zone_id) {
    conditions.push(`g.zone_id = $${idx++}`);
    values.push(zone_id);
  }

  if (direction) {
    conditions.push(`g.direction = $${idx++}`);
    values.push(direction);
  }

  if (typeof is_active === 'boolean') {
    conditions.push(`g.is_active = $${idx++}`);
    values.push(is_active);
  }

  if (device_serial) {
    conditions.push(`g.device_serial ILIKE $${idx++}`);
    values.push(`%${device_serial}%`);
  }

  if (search) {
    conditions.push(`g.location_name ILIKE $${idx++}`);
    values.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Join with zones to return zone_name alongside gate data
  const baseQuery = `
    FROM gates g
    LEFT JOIN zones z ON g.zone_id = z.zone_id
    ${where}
  `;

  const countResult = await pool.query(
    `SELECT COUNT(*) ${baseQuery}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT
        g.gate_id,
        g.location_name,
        g.direction,
        g.device_serial,
        g.is_active,
        g.zone_id,
        z.zone_name
     ${baseQuery}
     ORDER BY g.location_name ASC
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
// GET GATE BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getGateById = async (id) => {
  const { rows } = await pool.query(
    `SELECT
        g.gate_id,
        g.location_name,
        g.direction,
        g.device_serial,
        g.is_active,
        g.zone_id,
        z.zone_name
     FROM gates g
     LEFT JOIN zones z ON g.zone_id = z.zone_id
     WHERE g.gate_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Gate not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE GATE
// ─────────────────────────────────────────────────────────────────────────────
const updateGate = async (id, data) => {
  // If zone_id is being updated, validate it exists
  if (data.zone_id) {
    const zoneCheck = await pool.query(
      'SELECT zone_id FROM zones WHERE zone_id = $1',
      [data.zone_id]
    );
    if (!zoneCheck.rows[0]) {
      const err = new Error('Zone not found. Please provide a valid zone_id.');
      err.statusCode = 404;
      throw err;
    }
  }

  const allowed = ['location_name', 'direction', 'zone_id', 'device_serial', 'is_active'];
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
    `UPDATE gates SET ${fields.join(', ')} WHERE gate_id = $${idx} RETURNING *`,
    values
  );

  if (!rows[0]) {
    const err = new Error('Gate not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE GATE
// ─────────────────────────────────────────────────────────────────────────────
const deleteGate = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM gates WHERE gate_id = $1 RETURNING gate_id`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Gate not found.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Gate deleted successfully.', gate_id: rows[0].gate_id };
};

module.exports = {
  createGate,
  getAllGates,
  getGateById,
  updateGate,
  deleteGate,
};