const pool = require('../../config/db');

// ── Actual DB columns (from schema): ─────────────────────────────────────────
//   rule_id, zone_id, vehicle_type, price, is_active, created_by, created_at
const PUBLIC_COLUMNS = `
  pr.rule_id,
  pr.zone_id,
  z.zone_name,
  pr.vehicle_type,
  pr.price,
  pr.is_active,
  pr.created_by,
  a.first_name  AS created_by_first_name,
  a.last_name   AS created_by_last_name,
  pr.created_at
`;

const BASE_JOIN = `
  FROM pricing_rules pr
  JOIN zones  z ON pr.zone_id    = z.zone_id
  LEFT JOIN admins a ON pr.created_by = a.admin_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PRICING RULE
// ─────────────────────────────────────────────────────────────────────────────
const createPricingRule = async (data, adminId) => {
  const { zone_id, vehicle_type, price } = data;

  // 1. Verify zone exists
  const zoneResult = await pool.query(
    'SELECT zone_id FROM zones WHERE zone_id = $1',
    [zone_id]
  );
  if (!zoneResult.rows[0]) {
    const err = new Error('Zone not found.');
    err.statusCode = 404;
    throw err;
  }

  // 2. Check for existing active rule for this zone + vehicle_type
  const existing = await pool.query(
    `SELECT rule_id FROM pricing_rules
     WHERE zone_id = $1 AND vehicle_type = $2 AND is_active = TRUE`,
    [zone_id, vehicle_type]
  );
  if (existing.rows[0]) {
    const err = new Error(
      `An active pricing rule for vehicle type "${vehicle_type}" already exists in this zone. ` +
      `Deactivate it before creating a new one.`
    );
    err.statusCode = 409;
    throw err;
  }

  // 3. Insert
  const { rows } = await pool.query(
    `INSERT INTO pricing_rules (zone_id, vehicle_type, price, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING rule_id`,
    [zone_id, vehicle_type, price, adminId]
  );

  return getPricingRuleById(rows[0].rule_id);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PRICING RULES
// ─────────────────────────────────────────────────────────────────────────────
const getAllPricingRules = async ({
  page = 1, limit = 20,
  zone_id, vehicle_type, is_active,
}) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (zone_id) {
    conditions.push(`pr.zone_id = $${idx++}`);
    values.push(zone_id);
  }
  if (vehicle_type) {
    conditions.push(`pr.vehicle_type ILIKE $${idx++}`);
    values.push(`%${vehicle_type}%`);
  }
  if (typeof is_active === 'boolean') {
    conditions.push(`pr.is_active = $${idx++}`);
    values.push(is_active);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) ${BASE_JOIN} ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     ${BASE_JOIN}
     ${where}
     ORDER BY z.zone_name ASC, pr.vehicle_type ASC, pr.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PRICING RULE BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getPricingRuleById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE pr.rule_id = $1`,
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Pricing rule not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRICING RULE
// ─────────────────────────────────────────────────────────────────────────────
const updatePricingRule = async (id, data) => {
  // Only columns that actually exist in the DB
  const allowed = ['vehicle_type', 'price', 'is_active'];
  const fields  = [];
  const values  = [];
  let   idx     = 1;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key] ?? null);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 400;
    throw err;
  }

  values.push(id);
  await pool.query(
    `UPDATE pricing_rules SET ${fields.join(', ')} WHERE rule_id = $${idx}`,
    values
  );

  return getPricingRuleById(id);
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE PRICING RULE
// ─────────────────────────────────────────────────────────────────────────────
const deletePricingRule = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM pricing_rules WHERE rule_id = $1 RETURNING rule_id',
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Pricing rule not found.');
    err.statusCode = 404;
    throw err;
  }
  return {
    message: 'Pricing rule deleted successfully.',
    rule_id: rows[0].rule_id,
  };
};

module.exports = {
  createPricingRule,
  getAllPricingRules,
  getPricingRuleById,
  updatePricingRule,
  deletePricingRule,
};
