const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid': 'Invalid admin ID format. Must be a valid UUID.',
      'any.required': 'Admin ID parameter is required.',
    }),
  }),
};

// ── POST /admins ──────────────────────────────────────────────────────────────
const createAdminSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().max(255).required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    password: Joi.string().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters.',
        'string.pattern.base':
          'Password must contain uppercase, lowercase, a number, and a special character.',
        'any.required': 'Password is required.',
      }),
    first_name: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'First name is required.',
    }),
    last_name: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Last name is required.',
    }),
    phone_number: Joi.string().trim().max(20)
      .pattern(/^\+?[0-9]{7,20}$/).optional().allow('', null)
      .messages({
        'string.pattern.base': 'Phone number must be a valid international number.',
      }),
    admin_level: Joi.string()
      .valid('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR')
      .required()
      .messages({
        'any.only': 'admin_level must be one of: SUPER_ADMIN, SECURITY_ADMIN, FINANCE_ADMIN, OPERATOR.',
        'any.required': 'Admin level is required.',
      }),
    is_active: Joi.boolean().optional().default(true),
  }),
};

// ── GET /admins ───────────────────────────────────────────────────────────────
const listAdminsSchema = {
  [Segments.QUERY]: Joi.object({
    page:        Joi.number().integer().min(1).default(1),
    limit:       Joi.number().integer().min(1).max(100).default(20),
    is_active:   Joi.boolean().optional(),
    admin_level: Joi.string()
      .valid('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR')
      .optional(),
    search:      Joi.string().trim().max(100).optional(),
  }),
};

// ── PUT /admins/:id ───────────────────────────────────────────────────────────
const updateAdminSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().max(255).optional(),
    first_name:   Joi.string().trim().min(2).max(100).optional(),
    last_name:    Joi.string().trim().min(2).max(100).optional(),
    phone_number: Joi.string().trim().max(20)
      .pattern(/^\+?[0-9]{7,20}$/).optional().allow('', null),
    admin_level: Joi.string()
      .valid('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR')
      .optional(),
    is_active: Joi.boolean().optional(),
    // Explicitly block password changes via this endpoint
    password: Joi.any().forbidden().messages({
      'any.unknown': 'Password cannot be changed via this endpoint.',
    }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /admins/:id  &  DELETE /admins/:id ────────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  createAdminSchema,
  listAdminsSchema,
  updateAdminSchema,
  idParamSchema,
};