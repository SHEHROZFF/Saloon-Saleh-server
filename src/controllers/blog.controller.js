const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const slugify = require('slugify');

const createBlog = catchAsync(async (req, res, next) => {
  const { title, content, excerpt, image_url, status } = req.body;
  const staff_id = req.user.role === 'admin' ? req.body.staff_id : req.staff_id;

  if (!staff_id) {
    return next(new AppError('No staff profile linked to this user', 400));
  }

  const slug = `${slugify(title, { lower: true })}-${Math.random().toString(36).slice(-4)}`;

  const result = await db.query(
    `INSERT INTO staff_blogs (staff_id, title, slug, content, excerpt, image_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [staff_id, title, slug, content, excerpt, image_url, status || 'published']
  );

  res.status(201).json({
    status: 'success',
    data: { blog: result.rows[0] }
  });
});

const getAllBlogs = catchAsync(async (req, res) => {
  const { search, all } = req.query;

  let query = `SELECT b.*, s.name as staff_name, s.role as staff_role, s.avatar_url as staff_avatar
     FROM staff_blogs b
     JOIN staff s ON b.staff_id = s.id`;

  const conditions = ['b.is_deleted = false', 's.is_deleted = false'];
  const values = [];
  let paramIndex = 1;

  if (all !== 'true') {
    conditions.push("b.status = 'published'");
  }

  if (search) {
    conditions.push(`(b.title ILIKE $${paramIndex} OR b.excerpt ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY b.created_at DESC`;

  const result = await db.query(query, values);

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: { blogs: result.rows }
  });
});

const getStaffBlogs = catchAsync(async (req, res) => {
  const staffId = req.params.staffId;
  const result = await db.query(
    `SELECT * FROM staff_blogs WHERE staff_id = $1 AND is_deleted = false ORDER BY created_at DESC`,
    [staffId]
  );

  res.status(200).json({
    status: 'success',
    data: { blogs: result.rows }
  });
});

const getBlogBySlug = catchAsync(async (req, res, next) => {
  const result = await db.query(
    `SELECT b.*, s.name as staff_name, s.role as staff_role, s.avatar_url as staff_avatar, s.bio as staff_bio, s.specialties as staff_specialties, s.experience_years as staff_experience
     FROM staff_blogs b
     JOIN staff s ON b.staff_id = s.id
     WHERE b.slug = $1 AND b.is_deleted = false`,
    [req.params.slug]
  );

  if (!result.rows[0]) {
    return next(new AppError('Blog post not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { blog: result.rows[0] }
  });
});

const updateBlog = catchAsync(async (req, res, next) => {
  const { title, content, excerpt, image_url, status } = req.body;
  const blogId = req.params.id;

  // Check ownership
  const blogCheck = await db.query('SELECT staff_id FROM staff_blogs WHERE id = $1', [blogId]);
  if (!blogCheck.rows[0]) return next(new AppError('Blog not found', 404));

  if (req.user.role !== 'admin' && blogCheck.rows[0].staff_id !== req.staff_id) {
    return next(new AppError('You do not have permission to edit this blog', 403));
  }

  const result = await db.query(
    `UPDATE staff_blogs SET
       title = COALESCE($1, title),
       content = COALESCE($2, content),
       excerpt = COALESCE($3, excerpt),
       image_url = COALESCE($4, image_url),
       status = COALESCE($5, status),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [title, content, excerpt, image_url, status, blogId]
  );

  res.status(200).json({
    status: 'success',
    data: { blog: result.rows[0] }
  });
});

const deleteBlog = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;
  
  // Check ownership
  const blogCheck = await db.query('SELECT staff_id FROM staff_blogs WHERE id = $1', [blogId]);
  if (!blogCheck.rows[0]) return next(new AppError('Blog not found', 404));

  if (req.user.role !== 'admin' && blogCheck.rows[0].staff_id !== req.staff_id) {
    return next(new AppError('You do not have permission to delete this blog', 403));
  }

  await db.query('UPDATE staff_blogs SET is_deleted = true WHERE id = $1', [blogId]);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  createBlog,
  getAllBlogs,
  getStaffBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog
};
