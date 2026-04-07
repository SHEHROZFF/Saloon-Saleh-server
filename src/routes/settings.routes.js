const express = require('express');
const settingsController = require('../controllers/settings.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/public/bootstrap', settingsController.getBootstrapSettings);
router.get('/:key', settingsController.getSettings);
router.put('/:key', protect, restrictTo('admin'), settingsController.upsertSettings);

module.exports = router;
