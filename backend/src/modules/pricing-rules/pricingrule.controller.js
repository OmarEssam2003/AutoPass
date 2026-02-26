const pricingRuleService = require('./pricingrule.service');

// ── POST /api/pricing-rules ───────────────────────────────────────────────────
const createPricingRule = async (req, res, next) => {
  try {
    const rule = await pricingRuleService.createPricingRule(req.body);
    return res.status(201).json({
      status:  'success',
      message: 'Pricing rule created successfully.',
      data:    rule,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/pricing-rules ────────────────────────────────────────────────────
const getAllPricingRules = async (req, res, next) => {
  try {
    const { page, limit, zone_id, vehicle_type, is_active } = req.query;
    const result = await pricingRuleService.getAllPricingRules({
      page:         page   ? parseInt(page, 10)  : 1,
      limit:        limit  ? parseInt(limit, 10) : 20,
      zone_id:      zone_id      || undefined,
      vehicle_type: vehicle_type || undefined,
      is_active:    is_active !== undefined ? is_active === 'true' : undefined,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/pricing-rules/:id ────────────────────────────────────────────────
const getPricingRuleById = async (req, res, next) => {
  try {
    const rule = await pricingRuleService.getPricingRuleById(req.params.id);
    return res.status(200).json({ status: 'success', data: rule });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/pricing-rules/:id ────────────────────────────────────────────────
const updatePricingRule = async (req, res, next) => {
  try {
    const rule = await pricingRuleService.updatePricingRule(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Pricing rule updated successfully.',
      data:    rule,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/pricing-rules/:id ─────────────────────────────────────────────
const deletePricingRule = async (req, res, next) => {
  try {
    const result = await pricingRuleService.deletePricingRule(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPricingRule,
  getAllPricingRules,
  getPricingRuleById,
  updatePricingRule,
  deletePricingRule,
};