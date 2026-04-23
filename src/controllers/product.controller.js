const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { buildPaginatedQuery, parsePagination, buildPaginationMeta } = require('../utils/queryHelpers');

// ─── Categories ───

const getCategories = catchAsync(async (req, res) => {
  const result = await db.query('SELECT * FROM product_categories WHERE is_deleted = false ORDER BY sort_order ASC');

  res.status(200).json({
    status: 'success',
    data: { categories: result.rows },
  });
});

const createCategory = catchAsync(async (req, res) => {
  const { name, slug, sort_order } = req.body;

  const result = await db.query(
    `INSERT INTO product_categories (name, slug, sort_order)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, slug, sort_order || 0]
  );

  res.status(201).json({
    status: 'success',
    data: { category: result.rows[0] },
  });
});

// ─── Products ───

const getAllProducts = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { category_id, search, sort } = req.query;

  // Determine sort
  let sortColumn = 'p.sort_order';
  let sortOrder = 'ASC';
  if (sort === 'price-low') { sortColumn = 'p.price'; sortOrder = 'ASC'; }
  else if (sort === 'price-high') { sortColumn = 'p.price'; sortOrder = 'DESC'; }
  else if (sort === 'newest') { sortColumn = 'p.created_at'; sortOrder = 'DESC'; }

  const filters = {};
  if (category_id) filters['p.category_id'] = category_id;
  if (req.query.brand) filters['p.brand'] = req.query.brand;
  if (req.query.featured === 'true') filters['p.is_featured'] = true;

  const searchConfig = search
    ? { columns: ['p.title', 'p.brand'], term: search }
    : null;

  // Default to showing only active products for public shop
  // Allow explicit override from Admin dashboard
  if (req.query.include_inactive !== 'true') {
    filters['p.is_active'] = true;
  }
  
  filters['p.is_deleted'] = false;

  const baseQuery = `SELECT p.*, pc.name AS category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id`;

  const { text, values, countText, countValues } = buildPaginatedQuery({
    baseQuery,
    filters,
    search: searchConfig,
    sortColumn,
    sortOrder,
    page,
    limit,
  });

  const [dataResult, countResult] = await Promise.all([
    db.query(text, values),
    db.query(countText, countValues),
  ]);

  const totalItems = countResult.rows[0] ? parseInt(countResult.rows[0].count, 10) : 0;

  res.status(200).json({
    status: 'success',
    data: { products: dataResult.rows },
    pagination: buildPaginationMeta(totalItems, page, limit),
  });
});

const getProduct = catchAsync(async (req, res, next) => {
  const result = await db.query(
    `SELECT p.*, pc.name AS category_name
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     WHERE p.id = $1 AND p.is_deleted = false`,
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { product: result.rows[0] },
  });
});

const createProduct = catchAsync(async (req, res) => {
  const {
    title, brand, price, image_url, category_id,
    description, details, usage_instructions, benefits,
    is_active, is_featured, stock_quantity, sort_order,
  } = req.body;

  const result = await db.query(
    `INSERT INTO products (title, brand, price, image_url, category_id, description, details, usage_instructions, benefits, is_active, is_featured, stock_quantity, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [title, brand, price, image_url, category_id, description, details, usage_instructions, JSON.stringify(benefits || []), is_active, is_featured, stock_quantity, sort_order]
  );

  res.status(201).json({
    status: 'success',
    data: { product: result.rows[0] },
  });
});

const updateProduct = catchAsync(async (req, res, next) => {
  const {
    title, brand, price, image_url, category_id,
    description, details, usage_instructions, benefits,
    is_active, is_featured, stock_quantity, sort_order,
  } = req.body;

  const result = await db.query(
    `UPDATE products SET
       title = COALESCE($1, title),
       brand = COALESCE($2, brand),
       price = COALESCE($3, price),
       image_url = COALESCE($4, image_url),
       category_id = COALESCE($5, category_id),
       description = COALESCE($6, description),
       details = COALESCE($7, details),
       usage_instructions = COALESCE($8, usage_instructions),
       benefits = COALESCE($9, benefits),
       is_active = COALESCE($10, is_active),
       is_featured = COALESCE($11, is_featured),
       stock_quantity = COALESCE($12, stock_quantity),
       sort_order = COALESCE($13, sort_order)
     WHERE id = $14
     RETURNING *`,
    [title, brand, price, image_url, category_id, description, details, usage_instructions, benefits ? JSON.stringify(benefits) : undefined, is_active, is_featured, stock_quantity, sort_order, req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { product: result.rows[0] },
  });
});

const deleteProduct = catchAsync(async (req, res, next) => {
  const result = await db.query('UPDATE products SET is_deleted = true, is_active = false WHERE id = $1 RETURNING id', [req.params.id]);

  if (!result.rows[0]) {
    return next(new AppError('Product not found', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

const getBrands = catchAsync(async (req, res) => {
  const result = await db.query(
    `SELECT DISTINCT brand FROM products WHERE is_active = true AND is_deleted = false ORDER BY brand ASC`
  );

  res.status(200).json({
    status: 'success',
    data: { brands: result.rows.map(row => row.brand).filter(Boolean) },
  });
});

module.exports = {
  getCategories,
  createCategory,
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getBrands,
};
