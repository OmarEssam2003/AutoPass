const pool = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// COLUMNS  — matches the actual notifications table in the DB diagram:
//   notification_id, notification_type, severity, title, message,
//   vehicle_id, gate_id, event_id, enforcement_id, metadata,
//   is_read, read_by, read_at, created_at
// ═════════════════════════════════════════════════════════════════════════════

const PUBLIC_COLUMNS = `
  n.notification_id,
  n.notification_type,
  n.severity,
  n.title,
  n.message,
  n.vehicle_id,
  n.gate_id,
  n.event_id,
  n.enforcement_id,
  n.metadata,
  n.is_read,
  n.read_by,
  n.read_at,
  n.created_at,
  g.location_name  AS gate_name,
  v.plate_number,
  v.make,
  v.model
`;

const BASE_JOIN = `
  FROM notifications n
  LEFT JOIN gates    g ON n.gate_id    = g.gate_id
  LEFT JOIN vehicles v ON n.vehicle_id = v.vehicle_id
`;

// ═════════════════════════════════════════════════════════════════════════════
// LIST  (paginated + filterable)
// ═════════════════════════════════════════════════════════════════════════════

const getAllNotifications = async (opts = {}) => {
  const {
    page = 1, limit = 20,
    type, severity, is_read,
    gate_id, vehicle_id,
    date_from, date_to,
    sort_by = 'created_at', sort_order = 'DESC',
  } = opts;

  const conditions = [];
  const params     = [];
  let idx          = 1;

  if (type)       { conditions.push(`n.notification_type = $${idx++}`); params.push(type); }
  if (severity)   { conditions.push(`n.severity = $${idx++}`);          params.push(severity); }
  if (is_read !== null && is_read !== undefined) {
    conditions.push(`n.is_read = $${idx++}`);
    params.push(is_read);
  }
  if (gate_id)    { conditions.push(`n.gate_id = $${idx++}`);    params.push(gate_id); }
  if (vehicle_id) { conditions.push(`n.vehicle_id = $${idx++}`); params.push(vehicle_id); }
  if (date_from)  { conditions.push(`n.created_at >= $${idx++}`); params.push(date_from); }
  if (date_to)    { conditions.push(`n.created_at <= $${idx++}`); params.push(date_to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSort = ['created_at', 'notification_type', 'severity', 'is_read'];
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
    ORDER BY n.${col} ${order}
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

const getNotificationById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE n.notification_id = $1`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

// ═════════════════════════════════════════════════════════════════════════════
// UNREAD COUNT  (for admin badge)
// ═════════════════════════════════════════════════════════════════════════════

const getUnreadCount = async () => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS unread FROM notifications WHERE is_read = false`
  );
  return { unread: parseInt(rows[0].unread, 10) };
};

// ═════════════════════════════════════════════════════════════════════════════
// CREATE  (called from detection pipeline when enforcement hit / stolen detected)
// ═════════════════════════════════════════════════════════════════════════════

const createNotification = async (data, client = pool) => {
  const {
    notification_type,
    severity     = 'MEDIUM',
    title,
    message,
    vehicle_id   = null,
    gate_id      = null,
    event_id     = null,
    enforcement_id = null,
    metadata     = null,
  } = data;

  const { rows } = await client.query(
    `INSERT INTO notifications
       (notification_type, severity, title, message,
        vehicle_id, gate_id, event_id, enforcement_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      notification_type, severity, title, message,
      vehicle_id, gate_id, event_id, enforcement_id,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return rows[0];
};

// ═════════════════════════════════════════════════════════════════════════════
// MARK AS READ  (stores which admin read it + when)
// ═════════════════════════════════════════════════════════════════════════════

const markAsRead = async (id, adminId = null) => {
  const { rows } = await pool.query(
    `UPDATE notifications
     SET is_read = true,
         read_by = $2,
         read_at = NOW()
     WHERE notification_id = $1
     RETURNING *`,
    [id, adminId]
  );
  if (!rows[0]) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

const markAllAsRead = async (adminId = null) => {
  const { rowCount } = await pool.query(
    `UPDATE notifications
     SET is_read = true,
         read_by = $1,
         read_at = NOW()
     WHERE is_read = false`,
    [adminId]
  );
  return { message: `${rowCount} notification(s) marked as read.` };
};

// ═════════════════════════════════════════════════════════════════════════════
// DELETE
// ═════════════════════════════════════════════════════════════════════════════

const deleteNotification = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM notifications WHERE notification_id = $1 RETURNING notification_id`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }
  return { message: 'Notification deleted.', notification_id: id };
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
