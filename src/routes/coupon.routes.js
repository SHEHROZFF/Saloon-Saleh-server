const express = require('express');
const couponController = require('../controllers/coupon.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const couponValidation = require('../validations/coupon.validation');

const router = express.Router();

// ─── Public ───
router.post('/validate', validate(couponValidation.validate), couponController.validateCoupon);

// ─── Admin Only ───
router.use(protect, restrictTo('admin'));
router.post('/', validate(couponValidation.create), couponController.createCoupon);
router.get('/', couponController.getAllCoupons);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;
