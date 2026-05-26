const pool = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ZONE
// ─────────────────────────────────────────────────────────────────────────────
const createZone = async (data) => {
  const { zone_name, deduplication_window_minutes = 15 } = data;

  const { rows } = await pool.query(
    `INSERT INTO zones (zone_name, deduplication_window_minutes)
     VALUES ($1, $2)
     RETURNING *`,
    [zone_name, deduplication_window_minutes]
  );

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ZONES  (paginated, searchable)
// ─────────────────────────────────────────────────────────────────────────────
const getAllZones = async ({ page = 1, limit = 20, search }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`zone_name ILIKE $${idx++}`);
    values.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM zones ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT * FROM zones ${where} ORDER BY zone_name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
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
// GET ZONE BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getZoneById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM zones WHERE zone_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Zone not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ZONE
// ─────────────────────────────────────────────────────────────────────────────
const updateZone = async (id, data) => {
  const allowed = ['zone_name', 'deduplication_window_minutes'];
  const fields = [];
  const values = [];
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
    `UPDATE zones SET ${fields.join(', ')} WHERE zone_id = $${idx} RETURNING *`,
    values
  );

  if (!rows[0]) {
    const err = new Error('Zone not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ZONE
// ─────────────────────────────────────────────────────────────────────────────
const deleteZone = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM zones WHERE zone_id = $1 RETURNING zone_id`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Zone not found.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Zone deleted successfully.', zone_id: rows[0].zone_id };
};

module.exports = {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone,
};