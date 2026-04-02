const jwt = require('jsonwebtoken');
const config = require('../config/config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const authUtils = require('../utils/auth');
const db = require('../config/database');

const register = catchAsync(async (req, res, next) => {
    const { name, email, password, userType, phone, city, area } = req.body;

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
        return next(new AppError('User with this email already exists', 400));
    }

    const hashedPassword = await authUtils.hashPassword(password);

    // Create user in database
    const result = await db.query(
        `INSERT INTO users (name, email, password, user_type, phone, city, area) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, name, email, user_type, phone, city, area, created_at`,
        [name, email, hashedPassword, userType || 'customer', phone || null, city || null, area || null]
    );

    const user = result.rows[0];

    const token = authUtils.generateToken({ id: user.id, email: user.email, role: user.user_type });
    const refreshToken = authUtils.generateRefreshToken({ id: user.id });

    res.status(201).json({
        status: 'success',
        data: {
            user,
            token,
            refreshToken,
        },
    });
});

const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Find user by email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // Verify password
    const isPasswordValid = await authUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // Remove password from output
    delete user.password;

    const token = authUtils.generateToken({ id: user.id, email: user.email, role: user.user_type });
    const refreshToken = authUtils.generateRefreshToken({ id: user.id });

    res.status(200).json({
        status: 'success',
        data: {
            user,
            token,
            refreshToken,
        },
    });
});

const refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken: token } = req.body;

    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }

    // Check if user still exists
    const result = await db.query('SELECT id, email, user_type FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];

    if (!user) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    const newToken = authUtils.generateToken({ id: user.id, email: user.email, role: user.user_type });

    res.status(200).json({
        status: 'success',
        data: {
            token: newToken,
        },
    });
});

module.exports = {
    register,
    login,
    refreshToken,
};
