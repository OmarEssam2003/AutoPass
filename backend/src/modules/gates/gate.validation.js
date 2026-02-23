const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid': 'Invalid gate ID format. Must be a valid UUID.',
      'any.required': 'Gate ID parameter is required.',
    }),
  }),
};

// ── POST /gates ───────────────────────────────────────────────────────────────
const createGateSchema = {
  [Segments.BODY]: Joi.object({
    location_name: Joi.string().trim().min(2).max(255).required().messages({
      'any.required': 'Location name is required.',
      'string.min':   'Location name must be at least 2 characters.',
      'string.max':   'Location name cannot exceed 255 characters.',
    }),
    direction: Joi.string().valid('IN', 'OUT').required().messages({
      'any.only':     'Direction must be either IN or OUT.',
      'any.required': 'Direction is required.',
    }),
    zone_id: Joi.string().uuid({ version: 'uuidv4' }).optional().allow(null).messages({
      'string.guid': 'Invalid zone ID format. Must be a valid UUID.',
    }),
    device_serial: Joi.string().trim().max(100).optional().allow('', null),
    is_active:     Joi.boolean().optional().default(true),
  }),
};

// ── GET /gates ────────────────────────────────────────────────────────────────
const listGatesSchema = {
  [Segments.QUERY]: Joi.object({
    page:          Joi.number().integer().min(1).default(1),
    limit:         Joi.number().integer().min(1).max(100).default(20),
    zone_id:       Joi.string().uuid({ version: 'uuidv4' }).optional(),
    direction:     Joi.string().valid('IN', 'OUT').optional(),
    is_active:     Joi.boolean().optional(),
    device_serial: Joi.string().trim().max(100).optional(),
    search:        Joi.string().trim().max(100).optional(),
  }),
};

// ── PUT /gates/:id ────────────────────────────────────────────────────────────
const updateGateSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    location_name: Joi.string().trim().min(2).max(255).optional(),
    direction:     Joi.string().valid('IN', 'OUT').optional(),
    zone_id:       Joi.string().uuid({ version: 'uuidv4' }).optional().allow(null),
    device_serial: Joi.string().trim().max(100).optional().allow('', null),
    is_active:     Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /gates/:id  &  DELETE /gates/:id ─────────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  createGateSchema,
  listGatesSchema,
  updateGateSchema,
  idParamSchema,
};