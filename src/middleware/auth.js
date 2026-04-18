const jwt = require('jsonwebtoken');
const config = require('../config/config');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const db = require('../config/database');

const protect = catchAsync(async (req, res, next) => {
    // 1) Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token
    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
        return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // 3) Attach user to request
    req.user = decoded;

    // 4) If staff, attach staff_id
    if (decoded.role === 'staff' || decoded.role === 'admin') {
        const staffResult = await db.query('SELECT id FROM staff WHERE user_id = $1 AND is_deleted = false', [decoded.id]);
        if (staffResult.rows[0]) {
            req.staff_id = staffResult.rows[0].id;
        }
    }

    next();
});

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

module.exports = { protect, restrictTo };
