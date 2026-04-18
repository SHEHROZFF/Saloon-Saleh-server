const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');

const getAllUsers = catchAsync(async (req, res, next) => {
    const result = await db.query('SELECT id, name, email, phone, city, area, user_type, created_at FROM users WHERE is_deleted = false');
    const users = result.rows;

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: { users },
    });
});

const getUser = catchAsync(async (req, res, next) => {
    const result = await db.query('SELECT id, name, email, phone, city, area, user_type, created_at FROM users WHERE id = $1 AND is_deleted = false', [req.params.id]);
    const user = result.rows[0];

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

const getMe = catchAsync(async (req, res, next) => {
    const result = await db.query('SELECT id, name, email, phone, city, area, user_type, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

const updateMe = catchAsync(async (req, res, next) => {
    const { name, phone, city, area } = req.body;
    
    // Only allowing safe fields to be updated
    const result = await db.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             phone = COALESCE($2, phone), 
             city = COALESCE($3, city), 
             area = COALESCE($4, area)
         WHERE id = $5 
         RETURNING id, name, email, phone, city, area, user_type, created_at`,
        [name, phone, city, area, req.user.id]
    );

    res.status(200).json({
        status: 'success',
        data: { user: result.rows[0] },
    });
});

const updateUser = catchAsync(async (req, res, next) => {
    const { name, phone, city, area, userType } = req.body;

    const result = await db.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             phone = COALESCE($2, phone), 
             city = COALESCE($3, city), 
             area = COALESCE($4, area),
             user_type = COALESCE($5, user_type)
         WHERE id = $6 
         RETURNING id, name, email, phone, city, area, user_type, created_at`,
        [name, phone, city, area, userType, req.params.id]
    );

    if (!result.rows[0]) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user: result.rows[0] },
    });
});

const deleteUser = catchAsync(async (req, res, next) => {
    // Check if user is staff
    const user = await db.query('SELECT user_type FROM users WHERE id = $1', [req.params.id]);
    if (user.rows[0]?.user_type === 'staff') {
        await db.query('UPDATE staff SET is_deleted = true, is_active = false WHERE user_id = $1', [req.params.id]);
    }

    const result = await db.query(
        'UPDATE users SET is_deleted = true, is_active = false WHERE id = $1 RETURNING id',
        [req.params.id]
    );

    if (!result.rows[0]) {
        return next(new AppError('User not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

module.exports = {
    getAllUsers,
    getUser,
    getMe,
    updateMe,
    updateUser,
    deleteUser,
};
