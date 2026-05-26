const { Joi, Segments } = require('celebrate');

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PARAM SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid enforcement ID format. Must be a valid UUID.',
      'any.required': 'Enforcement ID parameter is required.',
    }),
  }),
};

// ── POST /vehicle-enforcements  (admin) ───────────────────────────────────────
const createEnforcementSchema = {
  [Segments.BODY]: Joi.object({
    plate_number: Joi.string().trim().uppercase().max(20).required().messages({
      'any.required': 'plate_number is required.',
    }),

    enforcement_type: Joi.string()
      .valid('STOP', 'AUTO_BLOCK', 'OBSERVE')
      .required()
      .messages({
        'any.only':     'enforcement_type must be STOP, AUTO_BLOCK, or OBSERVE.',
        'any.required': 'enforcement_type is required.',
      }),

    // Auto-derived from type if omitted: STOP=3, AUTO_BLOCK=2, OBSERVE=1
    priority: Joi.number().integer().valid(1, 2, 3).optional().messages({
      'any.only': 'priority must be 1 (OBSERVE), 2 (AUTO_BLOCK), or 3 (STOP).',
    }),

    reason: Joi.string().trim().min(5).max(1000).required().messages({
      'string.min':   'reason must be at least 5 characters.',
      'any.required': 'reason is required.',
    }),

    notes: Joi.string().trim().max(2000).optional().allow('', null),
  }),
};

// ── POST /vehicle-enforcements/report-stolen  (user) ─────────────────────────
// User only supplies plate_number + reason + optional notes.
// enforcement_type and priority are hardcoded to STOP/3 in the service —
// the user cannot choose or override them.
const reportStolenSchema = {
  [Segments.BODY]: Joi.object({
    plate_number: Joi.string().trim().uppercase().max(20).required().messages({
      'any.required': 'plate_number is required.',
      'string.max':   'plate_number must not exceed 20 characters.',
    }),

    reason: Joi.string().trim().min(10).max(1000).required().messages({
      'string.min':   'reason must be at least 10 characters. Please describe the theft briefly.',
      'string.max':   'reason must not exceed 1000 characters.',
      'any.required': 'reason is required.',
    }),

    notes: Joi.string().trim().max(2000).optional().allow('', null),
  }),
};

// ── GET /vehicle-enforcements  (admin) ────────────────────────────────────────
const listEnforcementsSchema = {
  [Segments.QUERY]: Joi.object({
    page:             Joi.number().integer().min(1).default(1),
    limit:            Joi.number().integer().min(1).max(100).default(20),
    plate_number:     Joi.string().trim().uppercase().max(20).optional(),
    enforcement_type: Joi.string().valid('STOP', 'AUTO_BLOCK', 'OBSERVE').optional(),
    is_active:        Joi.boolean().optional(),
    issued_by:        Joi.string().uuid({ version: 'uuidv4' }).optional(),
    priority:         Joi.number().integer().valid(1, 2, 3).optional(),
    // true  = show only user-reported stolen records
    // false = show only admin-created enforcements
    user_reported:    Joi.boolean().optional(),
  }),
};

// ── GET /vehicle-enforcements/my-stolen-reports  (user) ──────────────────────
const listMyStolenReportsSchema = {
  [Segments.QUERY]: Joi.object({
    page:  Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

// ── PUT /vehicle-enforcements/:id  (admin) ────────────────────────────────────
const updateEnforcementSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    enforcement_type: Joi.string()
      .valid('STOP', 'AUTO_BLOCK', 'OBSERVE')
      .optional()
      .messages({ 'any.only': 'enforcement_type must be STOP, AUTO_BLOCK, or OBSERVE.' }),

    priority: Joi.number().integer().valid(1, 2, 3).optional().messages({
      'any.only': 'priority must be 1 (OBSERVE), 2 (AUTO_BLOCK), or 3 (STOP).',
    }),

    reason:    Joi.string().trim().min(5).max(1000).optional(),
    notes:     Joi.string().trim().max(2000).optional().allow('', null),
    is_active: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /vehicle-enforcements/:id  &  DELETE /vehicle-enforcements/:id ────────
const idParamSchema = uuidParam;

module.exports = {
  createEnforcementSchema,
  reportStolenSchema,
  listEnforcementsSchema,
  listMyStolenReportsSchema,
  updateEnforcementSchema,
  idParamSchema,
};
