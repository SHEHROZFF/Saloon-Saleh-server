const jwt = require('jsonwebtoken');
const config = require('../config/config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const authUtils = require('../utils/auth');
const db = require('../config/database');
const emailService = require('../utils/email');

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

    // Send Welcome Email asynchronously (fire and forget)
    emailService.sendWelcomeEmail(user);

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
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', [email]);
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
    const result = await db.query('SELECT id, email, user_type FROM users WHERE id = $1 AND is_deleted = false', [decoded.id]);
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

const forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    const result = await db.query('SELECT id, email, name FROM users WHERE email = $1 AND is_deleted = false', [email]);
    const user = result.rows[0];

    if (!user) {
        // We return success even if user not found to prevent email enumeration attacks
        return res.status(200).json({ status: 'success', message: 'If that email address is in our database, we will send you an email to reset your password.' });
    }

    // Generate a short-lived token specifically for password reset (1 hour)
    const resetToken = jwt.sign({ id: user.id, purpose: 'password_reset' }, config.jwt.secret, { expiresIn: '1h' });

    await emailService.sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({ status: 'success', message: 'If that email address is in our database, we will send you an email to reset your password.' });
});

const resetPassword = catchAsync(async (req, res, next) => {
    const { token, newPassword } = req.body;

    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt.secret);
        if (decoded.purpose !== 'password_reset') {
            throw new Error('Invalid token purpose');
        }
    } catch (err) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    const hashedPassword = await authUtils.hashPassword(newPassword);

    const result = await db.query(
        'UPDATE users SET password = $1 WHERE id = $2 AND is_deleted = false RETURNING id, email',
        [hashedPassword, decoded.id]
    );

    if (!result.rows[0]) {
        return next(new AppError('User no longer exists.', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Password has been successfully reset. You can now log in.',
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
};
