const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { parsePagination, buildPaginationMeta } = require('../utils/queryHelpers');
const emailService = require('../utils/email');

// ─── Validate Coupon (Public) ───

const validateCoupon = catchAsync(async (req, res) => {
  const { code, order_total } = req.body;

  const result = await db.query(
    `SELECT * FROM coupons
     WHERE code = $1 AND is_active = true AND is_deleted = false
     AND (valid_until IS NULL OR valid_until > NOW())
     AND (usage_limit IS NULL OR times_used < usage_limit)`,
    [code.toUpperCase()]
  );

  const coupon = result.rows[0];

  if (!coupon) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid or expired coupon code.',
    });
  }

  if (order_total < parseFloat(coupon.min_order_amount)) {
    return res.status(400).json({
      status: 'fail',
      message: `Minimum order amount for this coupon is $${coupon.min_order_amount}.`,
    });
  }

  let discountAmount = coupon.discount_type === 'percentage'
    ? (order_total * parseFloat(coupon.discount_value)) / 100
    : parseFloat(coupon.discount_value);

  discountAmount = Math.min(discountAmount, order_total);

  res.status(200).json({
    status: 'success',
    data: {
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount.toFixed(2),
        new_total: (order_total - discountAmount).toFixed(2),
      },
    },
  });
});

// ─── Create Coupon (Admin) ───

const createCoupon = catchAsync(async (req, res) => {
  const {
    code, discount_type, discount_value,
    min_order_amount, usage_limit, valid_from, valid_until, is_active,
  } = req.body;

  const result = await db.query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, usage_limit, valid_from, valid_until, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [code.toUpperCase(), discount_type, discount_value, min_order_amount, usage_limit, valid_from, valid_until, is_active]
  );

  res.status(201).json({
    status: 'success',
    data: { coupon: result.rows[0] },
  });
});

// ─── Get All Coupons (Admin) ───

const getAllCoupons = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    db.query('SELECT * FROM coupons WHERE is_deleted = false ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
    db.query('SELECT COUNT(*) FROM coupons WHERE is_deleted = false'),
  ]);

  res.status(200).json({
    status: 'success',
    data: { coupons: dataResult.rows },
    pagination: buildPaginationMeta(countResult.rows[0].count, page, limit),
  });
});

// ─── Delete Coupon (Admin) ───

const deleteCoupon = catchAsync(async (req, res, next) => {
  const result = await db.query('UPDATE coupons SET is_deleted = true, is_active = false WHERE id = $1 RETURNING id', [req.params.id]);

  if (!result.rows[0]) {
    return next(new AppError('Coupon not found', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

// ─── Distribute Coupon (Admin) ───

const distributeCoupon = catchAsync(async (req, res, next) => {
  const { coupon_id, emails } = req.body;

  const result = await db.query('SELECT * FROM coupons WHERE id = $1', [coupon_id]);
  const coupon = result.rows[0];

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  const discountText = coupon.discount_type === 'percentage' 
    ? `${coupon.discount_value}%` 
    : `$${coupon.discount_value}`;

  // Send emails asynchronously
  emails.forEach(email => {
    emailService.sendCouponDistributionEmail(email, 'Customer', coupon.code, discountText);
  });

  res.status(200).json({
    status: 'success',
    message: `Coupon successfully distributed to ${emails.length} recipients.`,
  });
});

module.exports = {
  validateCoupon,
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  distributeCoupon,
};
