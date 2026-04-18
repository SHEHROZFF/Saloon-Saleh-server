const Joi = require('joi');

const create = Joi.object({
  code: Joi.string().min(3).max(50).uppercase().required(),
  discount_type: Joi.string().valid('percentage', 'fixed').required(),
  discount_value: Joi.number().positive().precision(2).required(),
  min_order_amount: Joi.number().min(0).precision(2).default(0),
  usage_limit: Joi.number().integer().min(1).allow(null),
  valid_from: Joi.date().iso().default(() => new Date()),
  valid_until: Joi.date().iso().allow(null),
  is_active: Joi.boolean().default(true),
});

const validate = Joi.object({
  code: Joi.string().required(),
  order_total: Joi.number().positive().required(),
});

const distribute = Joi.object({
  coupon_id: Joi.string().uuid().required(),
  emails: Joi.array().items(Joi.string().email()).min(1).required(),
});

module.exports = { create, validate, distribute };
