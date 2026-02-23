const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid': 'Invalid zone ID format. Must be a valid UUID.',
      'any.required': 'Zone ID parameter is required.',
    }),
  }),
};

// ── POST /zones ───────────────────────────────────────────────────────────────
const createZoneSchema = {
  [Segments.BODY]: Joi.object({
    zone_name: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Zone name is required.',
      'string.min': 'Zone name must be at least 2 characters.',
      'string.max': 'Zone name cannot exceed 100 characters.',
    }),
    deduplication_window_minutes: Joi.number().integer().min(1).max(1440).default(15).messages({
      'number.min': 'Deduplication window must be at least 1 minute.',
      'number.max': 'Deduplication window cannot exceed 1440 minutes (24 hours).',
    }),
  }),
};

// ── GET /zones ────────────────────────────────────────────────────────────────
const listZonesSchema = {
  [Segments.QUERY]: Joi.object({
    page:   Joi.number().integer().min(1).default(1),
    limit:  Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().max(100).optional(),
  }),
};

// ── PUT /zones/:id ────────────────────────────────────────────────────────────
const updateZoneSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    zone_name: Joi.string().trim().min(2).max(100).optional(),
    deduplication_window_minutes: Joi.number().integer().min(1).max(1440).optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /zones/:id  &  DELETE /zones/:id ─────────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  createZoneSchema,
  listZonesSchema,
  updateZoneSchema,
  idParamSchema,
};