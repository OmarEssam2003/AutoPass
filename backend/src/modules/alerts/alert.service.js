const pool = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// COLUMNS  — matches the actual alerts table in the DB diagram:
//   alert_id, user_id, admin_id, type, message, is_read, created_at
// ═════════════════════════════════════════════════════════════════════════════

const PUBLIC_COLUMNS = `
  a.alert_id,
  a.user_id,
  a.admin_id,
  a.type,
  a.message,
  a.is_read,
  a.created_at
`;

const BASE_JOIN = `FROM alerts a`;

// ═════════════════════════════════════════════════════════════════════════════
// LIST  (paginated + filterable — works for both user & admin queries)
// ═════════════════════════════════════════════════════════════════════════════

const getAllAlerts = async (opts = {}) => {
  const {
    page = 1, limit = 20,
    type, is_read,
    user_id, admin_id,
    sort_by = 'created_at', sort_order = 'DESC',
  } = opts;

  const conditions = [];
  const params     = [];
  let idx          = 1;

  if (type)    { conditions.push(`a.type = $${idx++}`);    params.push(type); }
  if (is_read !== null && is_read !== undefined) {
    conditions.push(`a.is_read = $${idx++}`);
    params.push(is_read);
  }
  if (user_id)  { conditions.push(`a.user_id = $${idx++}`);  params.push(user_id); }
  if (admin_id) { conditions.push(`a.admin_id = $${idx++}`); params.push(admin_id); }

  // If user_id is provided → user-facing alerts (admin_id IS NULL)
  // If admin_id is provided → admin-facing alerts (user_id IS NULL)
  // Both null and not filtered → admin sees everything
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSort = ['created_at', 'type', 'is_read'];
  const col   = allowedSort.includes(sort_by) ? sort_by : 'created_at';
  const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) ${BASE_JOIN} ${where}`;
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = parseInt(countRows[0].count, 10);

  const dataQuery = `
    SELECT ${PUBLIC_COLUMNS}
    ${BASE_JOIN}
    ${where}
    ORDER BY a.${col} ${order}
    LIMIT  $${idx++}
    OFFSET $${idx++}
  `;
  const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// GET BY ID
// ═════════════════════════════════════════════════════════════════════════════

const getAlertById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE a.alert_id = $1`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Alert not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

// ═════════════════════════════════════════════════════════════════════════════
// UNREAD COUNT
// user_id → count user alerts; null + audience='ADMIN' → count admin alerts
// ═════════════════════════════════════════════════════════════════════════════

const getUnreadCount = async (userId = null, audience = 'USER') => {
  let query, params;
  if (audience === 'USER' && userId) {
    query  = `SELECT COUNT(*) AS unread FROM alerts WHERE user_id = $1 AND is_read = false AND admin_id IS NULL`;
    params = [userId];
  } else {
    // Admin-facing: alerts that have an admin_id set (or no user_id)
    query  = `SELECT COUNT(*) AS unread FROM alerts WHERE admin_id IS NOT NULL AND is_read = false`;
    params = [];
  }
  const { rows } = await pool.query(query, params);
  return { unread: parseInt(rows[0].unread, 10) };
};

// ═════════════════════════════════════════════════════════════════════════════
// CREATE  (callable from detection pipeline, or manual admin)
// ═════════════════════════════════════════════════════════════════════════════

const createAlert = async (data, client = pool) => {
  const {
    user_id  = null,
    admin_id = null,
    type,
    message,
  } = data;

  const { rows } = await client.query(
    `INSERT INTO alerts (user_id, admin_id, type, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, admin_id, type, message]
  );
  return rows[0];
};

const createAlertInTransaction = async (data, client) => {
  return createAlert(data, client);
};

// ═════════════════════════════════════════════════════════════════════════════
// MARK AS READ
// ═════════════════════════════════════════════════════════════════════════════

const markAsRead = async (id) => {
  const { rows } = await pool.query(
    `UPDATE alerts SET is_read = true WHERE alert_id = $1 RETURNING *`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Alert not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

const markAllAsRead = async (userId = null, audience = 'USER') => {
  let query, params;
  if (audience === 'USER' && userId) {
    query  = `UPDATE alerts SET is_read = true WHERE user_id = $1 AND is_read = false AND admin_id IS NULL`;
    params = [userId];
  } else {
    query  = `UPDATE alerts SET is_read = true WHERE admin_id IS NOT NULL AND is_read = false`;
    params = [];
  }
  const { rowCount } = await pool.query(query, params);
  return { message: `${rowCount} alert(s) marked as read.` };
};

// ═════════════════════════════════════════════════════════════════════════════
// DELETE
// ═════════════════════════════════════════════════════════════════════════════

const deleteAlert = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM alerts WHERE alert_id = $1 RETURNING alert_id`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Alert not found.');
    err.statusCode = 404;
    throw err;
  }
  return { message: 'Alert deleted.', alert_id: id };
};

module.exports = {
  getAllAlerts,
  getAlertById,
  getUnreadCount,
  createAlert,
  createAlertInTransaction,
  markAsRead,
  markAllAsRead,
  deleteAlert,
};
