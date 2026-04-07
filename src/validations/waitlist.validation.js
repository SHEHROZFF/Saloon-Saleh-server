const Joi = require('joi');

const create = Joi.object({
  full_name: Joi.string().min(2).max(255).required(),
  phone: Joi.string().min(5).max(20).required(),
  desired_service: Joi.string().max(255).allow('', null),
});

const updateStatus = Joi.object({
  status: Joi.string().valid('pending', 'contacted', 'booked').required(),
});

module.exports = { create, updateStatus };
