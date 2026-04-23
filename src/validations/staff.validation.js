const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  role: Joi.string().max(100).required(),
  avatar_url: Joi.string().uri().allow('', null),
  phone: Joi.string().max(20).required(),
  email: Joi.string().email().required(),
  is_active: Joi.boolean().default(true),
  is_featured: Joi.boolean().default(false),
  sort_order: Joi.number().integer().min(0).default(0),
  service_ids: Joi.array().items(Joi.string().uuid()).default([]),
  bio: Joi.string().max(10000).allow('', null),
  specialties: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string().allow('', null)
  ),
  experience_years: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().allow('', null)
  ),
  instagram_url: Joi.string().uri().allow('', null),
  linkedin_url: Joi.string().uri().allow('', null),
});

const update = Joi.object({
  name: Joi.string().min(2).max(255),
  role: Joi.string().max(100),
  avatar_url: Joi.string().uri().allow('', null),
  phone: Joi.string().max(20),
  email: Joi.string().email(),
  is_active: Joi.boolean(),
  is_featured: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
  service_ids: Joi.array().items(Joi.string().uuid()),
  bio: Joi.string().max(10000).allow('', null),
  specialties: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string().allow('', null)
  ),
  experience_years: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().allow('', null)
  ),
  instagram_url: Joi.string().uri().allow('', null),
  linkedin_url: Joi.string().uri().allow('', null),
}).min(1);

module.exports = { create, update };
