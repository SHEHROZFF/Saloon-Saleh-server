const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        logger.error('ERROR 💥', err);

        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    } else {
        // Production
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        } else {
            // Programming or unknown error: don't leak error details
            logger.error('ERROR 💥', err);

            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!',
            });
        }
    }
};

module.exports = errorHandler;
