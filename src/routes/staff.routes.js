const express = require('express');
const staffController = require('../controllers/staff.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const staffValidation = require('../validations/staff.validation');

const router = express.Router();

// ─── Public ───
router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffMember);

// ─── Admin Only ───
router.use(protect, restrictTo('admin'));
router.post('/', validate(staffValidation.create), staffController.createStaff);
router.put('/:id', validate(staffValidation.update), staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
