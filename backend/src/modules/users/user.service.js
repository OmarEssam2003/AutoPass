const bcrypt = require('bcrypt');
const pool = require('../../config/db');

/**
 * Columns returned to callers — password_hash is NEVER included.
 *
 * SECURITY: Column Whitelisting
 * Explicitly listing columns instead of SELECT * ensures that even if
 * the schema changes (e.g. a sensitive column is added), it won't
 * accidentally be exposed through the API.
 */
const PUBLIC_COLUMNS = `
  user_id,
  email,
  first_name,
  middle_name,
  last_name,
  national_id,
  phone_number,
  address,
  date_of_birth,
  is_blocked,
  created_at
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────────────────────────────────────
const createUser = async (data) => {
  const {
    email,
    password,
    first_name,
    middle_name,
    last_name,
    national_id,
    phone_number,
    address,
    date_of_birth,
  } = data;

  /**
   * SECURITY: Password Hashing (bcrypt)
   * - saltRounds=12 makes brute-force attacks computationally expensive
   * - Even if DB is compromised, raw passwords are never exposed
   */
  const password_hash = await bcrypt.hash(password, 12);

  const query = `
    INSERT INTO users
      (email, password_hash, first_name, middle_name, last_name,
       national_id, phone_number, address, date_of_birth)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING ${PUBLIC_COLUMNS}
  `;

  /**
   * SECURITY: Parameterized Queries
   * Values are passed separately from the SQL string — the pg driver
   * handles escaping, making SQL injection impossible.
   */
  const values = [
    email, password_hash, first_name, middle_name || null,
    last_name, national_id, phone_number,
    address || null, date_of_birth || null,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL USERS  (paginated, filterable)
// ─────────────────────────────────────────────────────────────────────────────
const getAllUsers = async ({ page = 1, limit = 20, is_blocked, search }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (typeof is_blocked === 'boolean') {
    conditions.push(`is_blocked = $${idx++}`);
    values.push(is_blocked);
  }

  if (search) {
    conditions.push(
      `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`
    );
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query for pagination metadata
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM users ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Data query
  const dataQuery = `
    SELECT ${PUBLIC_COLUMNS}
    FROM users
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
// GET USER BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getUserById = async (id) => {
  const query = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE user_id = $1`;
  const { rows } = await pool.query(query, [id]);

  if (!rows[0]) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER  (password intentionally excluded)
// ─────────────────────────────────────────────────────────────────────────────
const updateUser = async (id, data) => {
  // Build SET clause dynamically from only the fields provided
  const allowed = [
    'email', 'first_name', 'middle_name', 'last_name',
    'national_id', 'phone_number', 'address', 'date_of_birth',
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

  values.push(id); // last param for WHERE

  const query = `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE user_id = $${idx}
    RETURNING ${PUBLIC_COLUMNS}
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────────────────────────────────────────
const deleteUser = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM users WHERE user_id = $1 RETURNING user_id`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'User deleted successfully.', user_id: rows[0].user_id };
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};