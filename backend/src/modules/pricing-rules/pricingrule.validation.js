const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid pricing rule ID format. Must be a valid UUID.',
      'any.required': 'Pricing rule ID parameter is required.',
    }),
  }),
};

// ── POST /pricing-rules ───────────────────────────────────────────────────────
const createPricingRuleSchema = {
  [Segments.BODY]: Joi.object({
    zone_id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'zone_id must be a valid UUID.',
      'any.required': 'zone_id is required.',
    }),
    vehicle_type: Joi.string().trim().max(50).required().messages({
      'any.required': 'vehicle_type is required.',
    }),
    price: Joi.number().precision(2).min(0).required().messages({
      'number.min':   'price cannot be negative.',
      'any.required': 'price is required.',
    }),
  }),
};

// ── GET /pricing-rules ────────────────────────────────────────────────────────
const listPricingRulesSchema = {
  [Segments.QUERY]: Joi.object({
    page:         Joi.number().integer().min(1).default(1),
    limit:        Joi.number().integer().min(1).max(100).default(20),
    zone_id:      Joi.string().uuid({ version: 'uuidv4' }).optional(),
    vehicle_type: Joi.string().trim().max(50).optional(),
    is_active:    Joi.boolean().optional(),
  }),
};

// ── PUT /pricing-rules/:id ────────────────────────────────────────────────────
const updatePricingRuleSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    vehicle_type: Joi.string().trim().max(50).optional(),
    price:        Joi.number().precision(2).min(0).optional().messages({
      'number.min': 'price cannot be negative.',
    }),
    is_active: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /pricing-rules/:id  &  DELETE /pricing-rules/:id ─────────────────────
const idParamSchema = uuidParam;

module.exports = {
  createPricingRuleSchema,
  listPricingRulesSchema,
  updatePricingRuleSchema,
  idParamSchema,
};
