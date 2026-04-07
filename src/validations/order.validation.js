const Joi = require('joi');

const addressSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().max(100).required(),
  company: Joi.string().max(255).allow('', null),
  country: Joi.string().max(100).required(),
  street_address: Joi.string().max(500).required(),
  apartment: Joi.string().max(255).allow('', null),
  city: Joi.string().max(100).required(),
  postcode: Joi.string().max(20).required(),
  phone: Joi.string().max(20).required(),
  email: Joi.string().email().required(),
});

const shippingAddressSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().max(100).required(),
  street_address: Joi.string().max(500).required(),
  city: Joi.string().max(100).required(),
  postcode: Joi.string().max(20).required(),
});

const orderItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  product_title: Joi.string().max(255).required(),
  product_brand: Joi.string().max(100).allow('', null),
  price: Joi.number().positive().precision(2).required(),
  quantity: Joi.number().integer().min(1).required(),
});

const create = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  billing_address: addressSchema.required(),
  shipping_address: shippingAddressSchema.allow(null),
  shipping_method: Joi.string().valid('delivery', 'pickup').default('delivery'),
  payment_method: Joi.string().valid('cod', 'card', 'transfer').default('cod'),
  order_notes: Joi.string().max(1000).allow('', null),
  coupon_code: Joi.string().max(50).allow('', null),
});

const updateStatus = Joi.object({
  order_status: Joi.string().valid('awaiting', 'processing', 'shipped', 'delivered', 'cancelled').required(),
  payment_status: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
});

module.exports = { create, updateStatus };
