const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  price: Joi.number().positive().precision(2).required(),
  duration: Joi.string().max(50).required(),
  category_id: Joi.string().uuid().allow(null),
  description: Joi.string().max(1000).allow('', null),
  gender_target: Joi.string().valid('Men', 'Women', 'Kids', 'All').default('All'),
  is_active: Joi.boolean().default(true),
  sort_order: Joi.number().integer().min(0).default(0),
});

const update = Joi.object({
  name: Joi.string().min(2).max(255),
  price: Joi.number().positive().precision(2),
  duration: Joi.string().max(50),
  category_id: Joi.string().uuid().allow(null),
  description: Joi.string().max(1000).allow('', null),
  gender_target: Joi.string().valid('Men', 'Women', 'Kids', 'All'),
  is_active: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
}).min(1);

const createCategory = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  sort_order: Joi.number().integer().min(0).default(0),
});

module.exports = { create, update, createCategory };
