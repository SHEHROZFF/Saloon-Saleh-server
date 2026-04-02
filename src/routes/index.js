const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');

const router = express.Router();

// Default route
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Saloon Saleh API',
        version: '1.0.0',
        endpoints: {
            auth: '/auth',
            users: '/users',
        },
    });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;
