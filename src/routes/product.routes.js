const express = require('express');
const productController = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const productValidation = require('../validations/product.validation');

const router = express.Router();

// ─── Public ───
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

// ─── Admin Only ───
router.use(protect, restrictTo('admin'));
router.post('/categories', validate(productValidation.createCategory), productController.createCategory);
router.post('/', validate(productValidation.create), productController.createProduct);
router.put('/:id', validate(productValidation.update), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
