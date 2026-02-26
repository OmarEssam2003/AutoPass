const pool = require('../../config/db');

const PUBLIC_COLUMNS = `
  r.rule_id,
  r.zone_id,
  r.vehicle_type,
  r.rate_per_hour,
  r.max_daily_cap,
  r.is_active,
  r.created_at,
  z.zone_name
`;

const BASE_JOIN = `
  FROM pricing_rules r
  JOIN zones z ON r.zone_id = z.zone_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PRICING RULE
// ─────────────────────────────────────────────────────────────────────────────
const createPricingRule = async (data) => {
  const { zone_id, vehicle_type, rate_per_hour, max_daily_cap, is_active } = data;

  // 1. Verify the zone exists
  const zoneCheck = await pool.query(
    'SELECT zone_id FROM zones WHERE zone_id = $1',
    [zone_id]
  );
  if (!zoneCheck.rows[0]) {
    const err = new Error('Zone not found. Please provide a valid zone_id.');
    err.statusCode = 404;
    throw err;
  }

  // 2. Prevent duplicate active rule for same zone + vehicle_type combination
  const duplicateCheck = await pool.query(
    `SELECT rule_id FROM pricing_rules
     WHERE zone_id = $1
       AND vehicle_type ILIKE $2
       AND is_active = TRUE`,
    [zone_id, vehicle_type]
  );
  if (duplicateCheck.rows[0]) {
    const err = new Error(
      `An active pricing rule for vehicle type "${vehicle_type}" already exists in this zone. ` +
      'Deactivate the existing rule before creating a new one.'
    );
    err.statusCode = 409;
    throw err;
  }

  // 3. Validate max_daily_cap is greater than rate_per_hour if provided
  if (max_daily_cap !== null && max_daily_cap !== undefined && max_daily_cap < rate_per_hour) {
    const err = new Error('Max daily cap cannot be less than the rate per hour.');
    err.statusCode = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO pricing_rules
       (zone_id, vehicle_type, rate_per_hour, max_daily_cap, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [zone_id, vehicle_type, rate_per_hour, max_daily_cap ?? null, is_active ?? true]
  );

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PRICING RULES
// ─────────────────────────────────────────────────────────────────────────────
const getAllPricingRules = async ({ page = 1, limit = 20, zone_id, vehicle_type, is_active }) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let idx = 1;

  if (zone_id) {
    conditions.push(`r.zone_id = $${idx++}`);
    values.push(zone_id);
  }

  if (vehicle_type) {
    conditions.push(`r.vehicle_type ILIKE $${idx++}`);
    values.push(`%${vehicle_type}%`);
  }

  if (typeof is_active === 'boolean') {
    conditions.push(`r.is_active = $${idx++}`);
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
     ORDER BY z.zone_name ASC, r.vehicle_type ASC
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
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE r.rule_id = $1`,
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
  // If zone_id is being updated, verify it exists
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

  // Fetch current rule to validate cap vs rate cross-field
  const current = await pool.query(
    'SELECT rate_per_hour, max_daily_cap FROM pricing_rules WHERE rule_id = $1',
    [id]
  );
  if (!current.rows[0]) {
    const err = new Error('Pricing rule not found.');
    err.statusCode = 404;
    throw err;
  }

  const newRate = data.rate_per_hour ?? parseFloat(current.rows[0].rate_per_hour);
  const newCap  = 'max_daily_cap' in data
    ? data.max_daily_cap
    : parseFloat(current.rows[0].max_daily_cap);

  if (newCap !== null && newCap !== undefined && newCap < newRate) {
    const err = new Error('Max daily cap cannot be less than the rate per hour.');
    err.statusCode = 400;
    throw err;
  }

  const allowed = ['zone_id', 'vehicle_type', 'rate_per_hour', 'max_daily_cap', 'is_active'];
  const fields  = [];
  const values  = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE pricing_rules SET ${fields.join(', ')} WHERE rule_id = $${idx} RETURNING *`,
    values
  );

  return rows[0];
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

  return { message: 'Pricing rule deleted successfully.', rule_id: rows[0].rule_id };
};

module.exports = {
  createPricingRule,
  getAllPricingRules,
  getPricingRuleById,
  updatePricingRule,
  deletePricingRule,
};