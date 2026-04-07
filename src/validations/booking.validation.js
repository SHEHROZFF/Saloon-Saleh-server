const Joi = require('joi');

const create = Joi.object({
  gender: Joi.string().valid('Men', 'Women', 'Kids').required(),
  service_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  staff_id: Joi.string().uuid().allow(null),
  booking_date: Joi.date().iso().required(),
  time_slot_id: Joi.string().uuid().required(),
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().max(100).allow('', null),
  email: Joi.string().email().required(),
  phone: Joi.string().min(5).max(20).required(),
  notes: Joi.string().max(1000).allow('', null),
});

const updateStatus = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled', 'no_show').required(),
});

module.exports = { create, updateStatus };
