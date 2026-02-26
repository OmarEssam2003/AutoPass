const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid event ID format. Must be a valid UUID.',
      'any.required': 'Event ID parameter is required.',
    }),
  }),
};

// ── POST /detection-events ────────────────────────────────────────────────────
// Posted by the ANPR camera/device at the gate
const createDetectionEventSchema = {
  [Segments.BODY]: Joi.object({
    gate_id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid gate ID format.',
      'any.required': 'Gate ID is required.',
    }),
    plate_number: Joi.string().trim().min(2).max(20).required().messages({
      'any.required': 'Plate number is required.',
      'string.min':   'Plate number must be at least 2 characters.',
      'string.max':   'Plate number cannot exceed 20 characters.',
    }),
    detected_at: Joi.date().iso().optional().default(() => new Date()).messages({
      'date.base': 'detected_at must be a valid ISO date.',
    }),
    snapshot_url: Joi.string().uri().max(2048).optional().allow('', null).messages({
      'string.uri': 'snapshot_url must be a valid URL.',
      'string.max': 'snapshot_url cannot exceed 2048 characters.',
    }),
    confidence_score: Joi.number().precision(2).min(0).max(100).optional().allow(null).messages({
      'number.min': 'Confidence score cannot be negative.',
      'number.max': 'Confidence score cannot exceed 100.',
    }),
  }),
};

// ── GET /detection-events ─────────────────────────────────────────────────────
const listDetectionEventsSchema = {
  [Segments.QUERY]: Joi.object({
    page:              Joi.number().integer().min(1).default(1),
    limit:             Joi.number().integer().min(1).max(100).default(20),
    gate_id:           Joi.string().uuid({ version: 'uuidv4' }).optional(),
    plate_number:      Joi.string().trim().max(20).optional(),
    is_duplicate:      Joi.boolean().optional(),
    from:              Joi.date().iso().optional(),
    to:                Joi.date().iso().min(Joi.ref('from')).optional().messages({
      'date.min': '"to" date must be after "from" date.',
    }),
    min_confidence:    Joi.number().min(0).max(100).optional(),
  }),
};

// ── GET /detection-events/:id  &  DELETE /detection-events/:id ───────────────
const idParamSchema = uuidParam;

module.exports = {
  createDetectionEventSchema,
  listDetectionEventsSchema,
  idParamSchema,
};