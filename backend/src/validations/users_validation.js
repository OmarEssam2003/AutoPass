const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password_hash: Joi.string().required(),
  first_name: Joi.string().required(),
  middle_name: Joi.string().allow(null, ''),
  last_name: Joi.string().required(),
  national_id: Joi.string().required(),
  phone_number: Joi.string().required(),
  address: Joi.string().allow(null, ''),
  date_of_birth: Joi.date().optional()
});

const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  password_hash: Joi.string().optional(),
  first_name: Joi.string().optional(),
  middle_name: Joi.string().allow(null, '').optional(),
  last_name: Joi.string().optional(),
  national_id: Joi.string().optional(),
  phone_number: Joi.string().optional(),
  address: Joi.string().allow(null, '').optional(),
  date_of_birth: Joi.date().optional()
}).min(1); // at least one field required

module.exports = {
  createUserSchema,
  updateUserSchema
};
