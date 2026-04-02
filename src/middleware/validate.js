const Joi = require('joi');
const AppError = require('../utils/AppError');

const validate = (schema) => {
    return (req, res, next) => {
        const validationOptions = {
            abortEarly: false, // include all errors
            allowUnknown: true, // ignore unknown props
            stripUnknown: true, // remove unknown props
        };

        const { error, value } = schema.validate(req.body, validationOptions);

        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            return next(new AppError(errorMessage, 400));
        }

        // Replace req.body with validated value
        req.body = value;
        next();
    };
};

module.exports = validate;
