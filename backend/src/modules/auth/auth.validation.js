const { Joi, Segments } = require('celebrate');

const loginSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required.',
    }),
  }),
};

module.exports = { loginSchema };