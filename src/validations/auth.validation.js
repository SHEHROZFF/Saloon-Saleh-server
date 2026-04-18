const Joi = require('joi');

const register = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    address: Joi.string().max(500),
    city: Joi.string().max(100),
    area: Joi.string().max(100),
    userType: Joi.string().valid('customer', 'admin', 'staff').default('customer'),
});

const login = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const refreshToken = Joi.object({
    refreshToken: Joi.string().required(),
});

const forgotPassword = Joi.object({
    email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
});

module.exports = {
    register,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
};
