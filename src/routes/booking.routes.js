const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const bookingValidation = require('../validations/booking.validation');

const router = express.Router();

// ─── Public ───
router.get('/availability', bookingController.checkAvailability);
router.get('/time-slots', bookingController.getTimeSlots);
router.post('/', validate(bookingValidation.create), bookingController.createBooking);

// ─── Authenticated (Customer) ───
router.get('/my', protect, bookingController.getMyBookings);

// ─── Staff Only ───
router.get('/staff/my', protect, restrictTo('staff'), bookingController.getStaffMyBookings);
router.patch('/staff/:id/status', protect, restrictTo('staff'), validate(bookingValidation.updateStatus), bookingController.updateStaffBookingStatus);

// ─── Admin Only ───
router.get('/', protect, restrictTo('admin'), bookingController.getAllBookings);
router.get('/:id', protect, restrictTo('admin', 'staff'), bookingController.getBooking);
router.patch('/:id/status', protect, restrictTo('admin'), validate(bookingValidation.updateStatus), bookingController.updateBookingStatus);
router.put('/:id', protect, restrictTo('admin'), bookingController.updateBookingDetails);
router.delete('/:id', protect, restrictTo('admin'), bookingController.deleteBooking);

module.exports = router;
