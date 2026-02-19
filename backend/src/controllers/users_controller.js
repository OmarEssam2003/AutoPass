const pool = require('../config/database');

exports.getAllUsers = async (req, res) => {
  const result = await pool.query('SELECT * FROM users');
  res.json(result.rows);
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM users WHERE user_id = $1',
    [id]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ message: 'User not found' });

  res.json(result.rows[0]);
};

exports.createUser = async (req, res) => {
  const {
    email,
    password_hash,
    first_name,
    middle_name,
    last_name,
    national_id,
    phone_number,
    address,
    date_of_birth
  } = req.body;

  try {
    const query = `
      INSERT INTO users 
      (email, password_hash, first_name, middle_name, last_name, national_id, phone_number, address, date_of_birth)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;

    const values = [
      email,
      password_hash,
      first_name,
      middle_name,
      last_name,
      national_id,
      phone_number,
      address,
      date_of_birth
    ];

    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);

  } catch (err) {

    // 🔥 THIS IS THE IMPORTANT PART
    if (err.code === '23505') {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    console.error(err);
    res.status(500).json({
      message: 'Internal Server Error'
    });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  const setQuery = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

  const result = await pool.query(
    `UPDATE users SET ${setQuery} WHERE user_id = $${fields.length + 1} RETURNING *`,
    [...values, id]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ message: 'User not found' });

  res.json(result.rows[0]);
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM users WHERE user_id = $1', [id]);

  res.json({ message: 'User deleted' });
};