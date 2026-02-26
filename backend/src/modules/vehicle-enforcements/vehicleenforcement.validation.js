const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid enforcement ID format. Must be a valid UUID.',
      'any.required': 'Enforcement ID parameter is required.',
    }),
  }),
};

// ── POST /vehicle-enforcements ────────────────────────────────────────────────
const createEnforcementSchema = {
  [Segments.BODY]: Joi.object({
    plate_number: Joi.string().trim().min(2).max(20).required().messages({
      'any.required': 'Plate number is required.',
      'string.min':   'Plate number must be at least 2 characters.',
      'string.max':   'Plate number cannot exceed 20 characters.',
    }),
    reason: Joi.string().trim().min(5).max(500).required().messages({
      'any.required': 'Reason is required.',
      'string.min':   'Reason must be at least 5 characters.',
      'string.max':   'Reason cannot exceed 500 characters.',
    }),
    notes: Joi.string().trim().max(1000).optional().allow('', null).messages({
      'string.max': 'Notes cannot exceed 1000 characters.',
    }),
    is_active: Joi.boolean().optional().default(true),
  }),
};

// ── GET /vehicle-enforcements ─────────────────────────────────────────────────
const listEnforcementsSchema = {
  [Segments.QUERY]: Joi.object({
    page:        Joi.number().integer().min(1).default(1),
    limit:       Joi.number().integer().min(1).max(100).default(20),
    plate_number: Joi.string().trim().max(20).optional(),
    is_active:   Joi.boolean().optional(),
    reported_by: Joi.string().uuid({ version: 'uuidv4' }).optional().messages({
      'string.guid': 'Invalid admin ID format for reported_by filter.',
    }),
  }),
};

// ── PUT /vehicle-enforcements/:id ─────────────────────────────────────────────
const updateEnforcementSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    reason:    Joi.string().trim().min(5).max(500).optional(),
    notes:     Joi.string().trim().max(1000).optional().allow('', null),
    is_active: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /vehicle-enforcements/:id  &  DELETE /vehicle-enforcements/:id ────────
const idParamSchema = uuidParam;

module.exports = {
  createEnforcementSchema,
  listEnforcementsSchema,
  updateEnforcementSchema,
  idParamSchema,
};