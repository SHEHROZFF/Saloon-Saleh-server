const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  role: Joi.string().max(100).required(),
  avatar_url: Joi.string().uri().allow('', null),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  is_active: Joi.boolean().default(true),
  sort_order: Joi.number().integer().min(0).default(0),
  service_ids: Joi.array().items(Joi.string().uuid()).default([]),
});

const update = Joi.object({
  name: Joi.string().min(2).max(255),
  role: Joi.string().max(100),
  avatar_url: Joi.string().uri().allow('', null),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  is_active: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
  service_ids: Joi.array().items(Joi.string().uuid()),
}).min(1);

module.exports = { create, update };
