const express = require('express');
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes below this middleware are protected
router.use(protect);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

// Admin only routes
router.use(restrictTo('admin'));
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
