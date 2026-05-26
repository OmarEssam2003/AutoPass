const pool = require('../../config/db');

const PUBLIC_COLUMNS = `
  al.audit_id,
  al.admin_id,
  a.first_name AS admin_first_name,
  a.last_name  AS admin_last_name,
  al.action_type,
  al.entity_type,
  al.entity_id,
  al.old_value,
  al.new_value,
  al.ip_address,
  al.created_at
`;

const BASE_JOIN = `
  FROM audit_logs al
  LEFT JOIN admins a ON al.admin_id = a.admin_id
`;

const getAllAuditLogs = async ({ page = 1, limit = 20, action_type, entity_type, from, to }) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (action_type) { conditions.push(`al.action_type ILIKE $${idx++}`); values.push(`%${action_type}%`); }
  if (entity_type) { conditions.push(`al.entity_type ILIKE $${idx++}`); values.push(`%${entity_type}%`); }
  if (from)        { conditions.push(`al.created_at >= $${idx++}`);      values.push(new Date(from)); }
  if (to)          { conditions.push(`al.created_at <= $${idx++}`);      values.push(new Date(to)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*) ${BASE_JOIN} ${where}`, values);
  const total       = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} ${where} ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return { data: rows, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
};

module.exports = { getAllAuditLogs };
