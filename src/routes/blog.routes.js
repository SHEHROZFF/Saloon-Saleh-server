const express = require('express');
const blogController = require('../controllers/blog.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', blogController.getAllBlogs);
router.get('/slug/:slug', blogController.getBlogBySlug);
router.get('/staff/:staffId', blogController.getStaffBlogs);

// Protected routes (Staff and Admin)
router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.post('/', blogController.createBlog);
router.patch('/:id', blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
