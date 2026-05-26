const bcrypt = require('bcrypt');
const pool = require('../../config/db');

/**
 * Columns returned to callers — password_hash is NEVER included.
 */
const PUBLIC_COLUMNS = `
  admin_id,
  email,
  first_name,
  last_name,
  phone_number,
  admin_level,
  is_active,
  created_at
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const createAdmin = async (data) => {
  const {
    email,
    password,
    first_name,
    last_name,
    phone_number,
    admin_level,
    is_active,
  } = data;

  const password_hash = await bcrypt.hash(password, 12);

  const query = `
    INSERT INTO admins
      (email, password_hash, first_name, last_name, phone_number, admin_level, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${PUBLIC_COLUMNS}
  `;

  const values = [
    email,
    password_hash,
    first_name,
    last_name,
    phone_number || null,
    admin_level,
    is_active ?? true,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ADMINS  (paginated, filterable)
// ─────────────────────────────────────────────────────────────────────────────
const getAllAdmins = async ({ page = 1, limit = 20, is_active, admin_level, search }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (typeof is_active === 'boolean') {
    conditions.push(`is_active = $${idx++}`);
    values.push(is_active);
  }

  if (admin_level) {
    conditions.push(`admin_level = $${idx++}`);
    values.push(admin_level);
  }

  if (search) {
    conditions.push(
      `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`
    );
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM admins ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataQuery = `
    SELECT ${PUBLIC_COLUMNS}
    FROM admins
    ${where}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const { rows } = await pool.query(dataQuery, [...values, limit, offset]);

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
// GET ADMIN BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getAdminById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM admins WHERE admin_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Admin not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ADMIN  (password intentionally excluded)
// ─────────────────────────────────────────────────────────────────────────────
const updateAdmin = async (id, data) => {
  const allowed = [
    'email', 'first_name', 'last_name',
    'phone_number', 'admin_level', 'is_active',
  ];

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

  const query = `
    UPDATE admins
    SET ${fields.join(', ')}
    WHERE admin_id = $${idx}
    RETURNING ${PUBLIC_COLUMNS}
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    const err = new Error('Admin not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const deleteAdmin = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM admins WHERE admin_id = $1 RETURNING admin_id`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Admin not found.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Admin deleted successfully.', admin_id: rows[0].admin_id };
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};