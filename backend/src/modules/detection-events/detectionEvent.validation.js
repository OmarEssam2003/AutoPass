const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid':  'Invalid event ID format. Must be a valid UUID.',
      'any.required': 'Event ID parameter is required.',
    }),
  }),
};

// ── POST /detection-events/test  (admin testing endpoint) ─────────────────────
// Text-only: just gate_id + plate_number. Runs the full pipeline.
const testDetectionSchema = {
  [Segments.BODY]: Joi.object({
    gate_id: Joi.string().uuid().required().messages({
      'string.guid':  'gate_id must be a valid UUID.',
      'any.required': 'gate_id is required.',
    }),
    plate_number: Joi.string().trim().min(1).max(20).required().messages({
      'any.required': 'plate_number is required.',
      'string.max':   'plate_number must not exceed 20 characters.',
    }),
  }),
};

// ── POST /detection-events  (Raspberry Pi with image upload) ──────────────────
const createDetectionEventSchema = {
  [Segments.BODY]: Joi.object({
    gate_id: Joi.string().uuid().required().messages({
      'string.guid':  'gate_id must be a valid UUID.',
      'any.required': 'gate_id is required.',
    }),
    plate_detected:      Joi.boolean().optional().allow(null),
    detection_stage:     Joi.string()
                           .valid('NO_PLATE', 'TEMPLATE_FAIL', 'OCR_FAIL', 'SUCCESS')
                           .optional().allow(null),
    template_confidence: Joi.number().min(0).max(1).optional().allow(null),
    ocr_text:            Joi.string().trim().uppercase().max(20).optional().allow(null, ''),
    ocr_confidence:      Joi.number().min(0).max(1).optional().allow(null),
    decision:            Joi.string().valid('OPEN', 'DENY').optional().allow(null),
    failure_reason:      Joi.string().trim().max(500).optional().allow(null, ''),
  }),
};

// Multipart validation — runs after multer parses the form
const validateCreateDetectionEvent = async (req, res, next) => {
  if (!req.file) {
    return res.status(422).json({
      status:  'error',
      message: 'gate_image is required. Send the snapshot as a file field named "gate_image".',
    });
  }

  const schema = createDetectionEventSchema[Segments.BODY];
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map(d => ({
      field:   d.path.join('.'),
      message: d.message,
    }));
    return res.status(422).json({ status: 'error', message: 'Validation failed', details });
  }

  if (value.plate_detected !== undefined && value.plate_detected !== null) {
    value.plate_detected = value.plate_detected === 'true' || value.plate_detected === true;
  }
  if (value.template_confidence !== undefined && value.template_confidence !== null) {
    value.template_confidence = parseFloat(value.template_confidence);
  }
  if (value.ocr_confidence !== undefined && value.ocr_confidence !== null) {
    value.ocr_confidence = parseFloat(value.ocr_confidence);
  }

  req.body = value;
  next();
};

// ── GET /detection-events ─────────────────────────────────────────────────────
const listDetectionEventsSchema = {
  [Segments.QUERY]: Joi.object({
    page:             Joi.number().integer().min(1).default(1),
    limit:            Joi.number().integer().min(1).max(100).default(20),
    gate_id:          Joi.string().uuid().optional(),
    vehicle_id:       Joi.string().uuid().optional(),
    plate_number:     Joi.string().trim().uppercase().max(20).optional(),
    detection_stage:  Joi.string()
                        .valid('NO_PLATE', 'TEMPLATE_FAIL', 'OCR_FAIL', 'SUCCESS')
                        .optional(),
    decision:         Joi.string().valid('OPEN', 'DENY').optional(),
    is_duplicate:     Joi.boolean().optional(),
    from:             Joi.date().iso().optional(),
    to:               Joi.date().iso().min(Joi.ref('from')).optional().messages({
      'date.min': '"to" must be after "from".',
    }),
  }),
};

// ── PUT /detection-events/:id  (SUPER_ADMIN only) ─────────────────────────────
const updateDetectionEventSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    plate_detected:      Joi.boolean().optional().allow(null),
    detection_stage:     Joi.string()
                           .valid('NO_PLATE', 'TEMPLATE_FAIL', 'OCR_FAIL', 'SUCCESS')
                           .optional().allow(null),
    template_confidence: Joi.number().min(0).max(1).optional().allow(null),
    ocr_text:            Joi.string().trim().uppercase().max(20).optional().allow(null, ''),
    ocr_confidence:      Joi.number().min(0).max(1).optional().allow(null),
    decision:            Joi.string().valid('OPEN', 'DENY').optional().allow(null),
    failure_reason:      Joi.string().trim().max(500).optional().allow(null, ''),
    is_duplicate:        Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

const idParamSchema = uuidParam;

module.exports = {
  testDetectionSchema,             // ← NEW
  createDetectionEventSchema,
  validateCreateDetectionEvent,
  listDetectionEventsSchema,
  updateDetectionEventSchema,
  idParamSchema,
};
