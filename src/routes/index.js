const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const productRoutes = require('./product.routes');
const serviceRoutes = require('./service.routes');
const staffRoutes = require('./staff.routes');
const bookingRoutes = require('./booking.routes');
const orderRoutes = require('./order.routes');
const couponRoutes = require('./coupon.routes');
const waitlistRoutes = require('./waitlist.routes');
const adminRoutes = require('./admin.routes');
const settingsRoutes = require('./settings.routes');

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
      products: '/products',
      services: '/services',
      staff: '/staff',
      bookings: '/bookings',
      orders: '/orders',
      coupons: '/coupons',
      waitlist: '/waitlist',
      admin: '/admin',
      settings: '/settings',
    },
  });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/services', serviceRoutes);
router.use('/staff', staffRoutes);
router.use('/bookings', bookingRoutes);
router.use('/orders', orderRoutes);
router.use('/coupons', couponRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
