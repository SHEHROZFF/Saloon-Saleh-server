const express = require('express');
const serviceController = require('../controllers/service.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const serviceValidation = require('../validations/service.validation');

const router = express.Router();

// ─── Public ───
router.get('/categories', serviceController.getCategories);
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getService);

// ─── Admin Only ───
router.use(protect, restrictTo('admin'));
router.post('/categories', validate(serviceValidation.createCategory), serviceController.createCategory);
router.post('/', validate(serviceValidation.create), serviceController.createService);
router.put('/:id', validate(serviceValidation.update), serviceController.updateService);
router.delete('/:id', serviceController.deleteService);

module.exports = router;
