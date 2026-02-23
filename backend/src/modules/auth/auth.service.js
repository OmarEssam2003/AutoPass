const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

/**
 * Attempts to log in either a user or an admin.
 *
 * Strategy:
 * 1. Look up the email in the users table first
 * 2. If not found, look in the admins table
 * 3. Verify the password against the stored hash
 * 4. Return a signed JWT containing identity + role info
 */
const login = async (email, password) => {
  let account = null;
  let accountType = null;

  // ── 1. Check users table ────────────────────────────────────────────────────
  const userResult = await pool.query(
    'SELECT user_id AS id, email, password_hash, is_blocked FROM users WHERE email = $1',
    [email]
  );

  if (userResult.rows.length > 0) {
    account = userResult.rows[0];
    accountType = 'user';
  }

  // ── 2. Check admins table ───────────────────────────────────────────────────
  if (!account) {
    const adminResult = await pool.query(
      'SELECT admin_id AS id, email, password_hash, admin_level, is_active FROM admins WHERE email = $1',
      [email]
    );

    if (adminResult.rows.length > 0) {
      account = adminResult.rows[0];
      accountType = 'admin';
    }
  }

  // ── 3. No account found — use a generic message to prevent user enumeration ─
  // SECURITY: Never say "email not found" — that lets attackers know which
  // emails are registered. Always return the same message for wrong email OR
  // wrong password.
  if (!account) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // ── 4. Verify password ──────────────────────────────────────────────────────
  const isMatch = await bcrypt.compare(password, account.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // ── 5. Check account status ─────────────────────────────────────────────────
  if (accountType === 'user' && account.is_blocked) {
    const err = new Error('Your account has been blocked. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  if (accountType === 'admin' && !account.is_active) {
    const err = new Error('Your admin account is inactive. Please contact a SUPER_ADMIN.');
    err.statusCode = 403;
    throw err;
  }

  // ── 6. Build JWT payload ────────────────────────────────────────────────────
  const payload = {
    id:   account.id,
    type: accountType,
    email: account.email,
    ...(accountType === 'admin' && { admin_level: account.admin_level }),
  };

  // ── 7. Sign token ───────────────────────────────────────────────────────────
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

  // ── 8. Build clean response (no password hash) ──────────────────────────────
  const responseData = {
    id:    account.id,
    email: account.email,
    type:  accountType,
    ...(accountType === 'admin' && { admin_level: account.admin_level }),
  };

  return { token, account: responseData };
};

module.exports = { login };