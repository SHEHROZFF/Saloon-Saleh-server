const express = require('express');
const reportController = require('../controllers/report.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All report routes are admin only
router.use(protect, restrictTo('admin'));

router.get('/business', reportController.getBusinessReport);
router.get('/staff', reportController.getStaffReport);

module.exports = router;
