const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');

// ─── Categories ───

const getCategories = catchAsync(async (req, res) => {
  const result = await db.query('SELECT * FROM service_categories ORDER BY sort_order ASC');

  res.status(200).json({
    status: 'success',
    data: { categories: result.rows },
  });
});

const createCategory = catchAsync(async (req, res) => {
  const { name, sort_order } = req.body;

  const result = await db.query(
    `INSERT INTO service_categories (name, sort_order)
     VALUES ($1, $2)
     RETURNING *`,
    [name, sort_order || 0]
  );

  res.status(201).json({
    status: 'success',
    data: { category: result.rows[0] },
  });
});

// ─── Services ───

const getAllServices = catchAsync(async (req, res) => {
  const { category_id, gender } = req.query;

  let query = `SELECT s.*, sc.name AS category_name
    FROM services s
    LEFT JOIN service_categories sc ON s.category_id = sc.id
    WHERE s.is_active = true`;

  const values = [];
  let paramIndex = 1;

  if (category_id) {
    query += ` AND s.category_id = $${paramIndex}`;
    values.push(category_id);
    paramIndex++;
  }

  if (gender) {
    query += ` AND (s.gender_target = $${paramIndex} OR s.gender_target = 'All')`;
    values.push(gender);
    paramIndex++;
  }

  query += ' ORDER BY s.sort_order ASC';

  const result = await db.query(query, values);

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: { services: result.rows },
  });
});

const getService = catchAsync(async (req, res, next) => {
  const result = await db.query(
    `SELECT s.*, sc.name AS category_name
     FROM services s
     LEFT JOIN service_categories sc ON s.category_id = sc.id
     WHERE s.id = $1`,
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Service not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { service: result.rows[0] },
  });
});

const createService = catchAsync(async (req, res) => {
  const { name, price, duration, category_id, description, gender_target, is_active, sort_order } = req.body;

  const result = await db.query(
    `INSERT INTO services (name, price, duration, category_id, description, gender_target, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, price, duration, category_id, description, gender_target, is_active, sort_order]
  );

  res.status(201).json({
    status: 'success',
    data: { service: result.rows[0] },
  });
});

const updateService = catchAsync(async (req, res, next) => {
  const { name, price, duration, category_id, description, gender_target, is_active, sort_order } = req.body;

  const result = await db.query(
    `UPDATE services SET
       name = COALESCE($1, name),
       price = COALESCE($2, price),
       duration = COALESCE($3, duration),
       category_id = COALESCE($4, category_id),
       description = COALESCE($5, description),
       gender_target = COALESCE($6, gender_target),
       is_active = COALESCE($7, is_active),
       sort_order = COALESCE($8, sort_order)
     WHERE id = $9
     RETURNING *`,
    [name, price, duration, category_id, description, gender_target, is_active, sort_order, req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Service not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { service: result.rows[0] },
  });
});

const deleteService = catchAsync(async (req, res, next) => {
  const result = await db.query('DELETE FROM services WHERE id = $1 RETURNING id', [req.params.id]);

  if (!result.rows[0]) {
    return next(new AppError('Service not found', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

module.exports = {
  getCategories,
  createCategory,
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
};
