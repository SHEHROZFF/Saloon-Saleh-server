const express = require('express');
const waitlistController = require('../controllers/waitlist.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const waitlistValidation = require('../validations/waitlist.validation');

const router = express.Router();

// ─── Public ───
router.post('/', validate(waitlistValidation.create), waitlistController.submitWaitlist);

// ─── Admin Only ───
router.use(protect, restrictTo('admin'));
router.get('/', waitlistController.getAllWaitlist);
router.patch('/:id/status', validate(waitlistValidation.updateStatus), waitlistController.updateWaitlistStatus);

module.exports = router;
