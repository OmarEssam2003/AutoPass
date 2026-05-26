const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid': 'Invalid vehicle ID format. Must be a valid UUID.',
      'any.required': 'Vehicle ID parameter is required.',
    }),
  }),
};

// ── POST /vehicles ────────────────────────────────────────────────────────────
const createVehicleSchema = {
  [Segments.BODY]: Joi.object({
    plate_number: Joi.string().trim().min(2).max(20).required().messages({
      'any.required': 'Plate number is required.',
      'string.min':   'Plate number must be at least 2 characters.',
      'string.max':   'Plate number cannot exceed 20 characters.',
    }),
    vehicle_type: Joi.string().trim().max(50).optional().allow('', null),
    make:         Joi.string().trim().max(50).optional().allow('', null),
    model:        Joi.string().trim().max(50).optional().allow('', null),
    color:        Joi.string().trim().max(30).optional().allow('', null),
    owner_phone_number: Joi.string().trim().max(20)
      .pattern(/^\+?[0-9]{7,20}$/)
      .required()
      .messages({
        'any.required':        'Owner phone number is required.',
        'string.pattern.base': 'Owner phone number must be a valid international number.',
      }),
  }),
};

// ── GET /vehicles ─────────────────────────────────────────────────────────────
const listVehiclesSchema = {
  [Segments.QUERY]: Joi.object({
    page:               Joi.number().integer().min(1).default(1),
    limit:              Joi.number().integer().min(1).max(100).default(20),
    vehicle_type:       Joi.string().trim().max(50).optional(),
    make:               Joi.string().trim().max(50).optional(),
    color:              Joi.string().trim().max(30).optional(),
    plate_number:       Joi.string().trim().max(20).optional(),
    owner_phone_number: Joi.string().trim().max(20).optional(),
  }),
};

// ── PUT /vehicles/:id ─────────────────────────────────────────────────────────
const updateVehicleSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    plate_number:       Joi.string().trim().min(2).max(20).optional(),
    vehicle_type:       Joi.string().trim().max(50).optional().allow('', null),
    make:               Joi.string().trim().max(50).optional().allow('', null),
    model:              Joi.string().trim().max(50).optional().allow('', null),
    color:              Joi.string().trim().max(30).optional().allow('', null),
    owner_phone_number: Joi.string().trim().max(20)
      .pattern(/^\+?[0-9]{7,20}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Owner phone number must be a valid international number.',
      }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /vehicles/:id  &  DELETE /vehicles/:id ────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  createVehicleSchema,
  listVehiclesSchema,
  updateVehicleSchema,
  idParamSchema,
};