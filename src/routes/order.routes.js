const express = require('express');
const orderController = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const orderValidation = require('../validations/order.validation');

const router = express.Router();

// ─── Public (guest checkout allowed) ───
router.post('/', validate(orderValidation.create), orderController.createOrder);

// ─── Authenticated ───
router.get('/my', protect, orderController.getMyOrders);

// ─── Admin Only ───
router.get('/', protect, restrictTo('admin'), orderController.getAllOrders);
router.get('/:id', protect, restrictTo('admin'), orderController.getOrder);
router.patch('/:id/status', protect, restrictTo('admin'), validate(orderValidation.updateStatus), orderController.updateOrderStatus);

module.exports = router;
