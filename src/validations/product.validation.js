const Joi = require('joi');

const create = Joi.object({
  title: Joi.string().min(2).max(255).required(),
  brand: Joi.string().max(100).default('Salon Saleh'),
  price: Joi.number().positive().precision(2).required(),
  image_url: Joi.string().uri().allow('', null),
  category_id: Joi.string().uuid().allow(null),
  description: Joi.string().max(1000).allow('', null),
  details: Joi.string().max(5000).allow('', null),
  usage_instructions: Joi.string().max(2000).allow('', null),
  benefits: Joi.array().items(Joi.string()).default([]),
  is_active: Joi.boolean().default(true),
  is_featured: Joi.boolean().default(false),
  stock_quantity: Joi.number().integer().min(0).default(0),
  sort_order: Joi.number().integer().min(0).default(0),
});

const update = Joi.object({
  title: Joi.string().min(2).max(255),
  brand: Joi.string().max(100),
  price: Joi.number().positive().precision(2),
  image_url: Joi.string().uri().allow('', null),
  category_id: Joi.string().uuid().allow(null),
  description: Joi.string().max(1000).allow('', null),
  details: Joi.string().max(5000).allow('', null),
  usage_instructions: Joi.string().max(2000).allow('', null),
  benefits: Joi.array().items(Joi.string()),
  is_active: Joi.boolean(),
  is_featured: Joi.boolean(),
  stock_quantity: Joi.number().integer().min(0),
  sort_order: Joi.number().integer().min(0),
}).min(1);

const createCategory = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().max(100).required(),
  sort_order: Joi.number().integer().min(0).default(0),
});

module.exports = { create, update, createCategory };
