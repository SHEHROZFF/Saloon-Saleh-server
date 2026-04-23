const Joi = require('joi');

const create = Joi.object({
  title: Joi.string().min(2).max(255).required(),
  content: Joi.string().min(10).required(),
  excerpt: Joi.string().max(1000).allow('', null),
  image_url: Joi.string().uri().allow('', null),
  status: Joi.string().valid('draft', 'published').default('published'),
  staff_id: Joi.string().uuid().allow(null) // allowed for admin override
});

const update = Joi.object({
  title: Joi.string().min(2).max(255),
  content: Joi.string().min(10),
  excerpt: Joi.string().max(1000).allow('', null),
  image_url: Joi.string().uri().allow('', null),
  status: Joi.string().valid('draft', 'published'),
}).min(1);

module.exports = { create, update };
