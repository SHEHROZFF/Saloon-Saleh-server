const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { parsePagination, buildPaginationMeta } = require('../utils/queryHelpers');
const emailService = require('../utils/email');

// ─── Submit Waitlist Entry (Public) ───

const submitWaitlist = catchAsync(async (req, res) => {
  const { full_name, phone, email, desired_service } = req.body;

  const result = await db.query(
    `INSERT INTO waitlist (full_name, phone, email, desired_service)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [full_name, phone, email, desired_service]
  );

  res.status(201).json({
    status: 'success',
    message: 'You have been added to the waitlist. Our concierge will contact you shortly.',
    data: { waitlist: result.rows[0] },
  });

  if (result.rows[0].email) {
    emailService.sendWaitlistConfirmation(result.rows[0].email, result.rows[0]);
  }
});

// ─── Get All Waitlist Entries (Admin) ───

const getAllWaitlist = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { status } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM waitlist';
  let countQuery = 'SELECT COUNT(*) FROM waitlist';
  const values = [];
  let paramIndex = 1;

  if (status) {
    const whereClause = ` WHERE status = $${paramIndex} AND is_deleted = false`;
    query += whereClause;
    countQuery += whereClause;
    values.push(status);
    paramIndex++;
  } else {
    const whereClause = ` WHERE is_deleted = false`;
    query += whereClause;
    countQuery += whereClause;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(query, [...values, limit, offset]),
    db.query(countQuery, values),
  ]);

  res.status(200).json({
    status: 'success',
    data: { waitlist: dataResult.rows },
    pagination: buildPaginationMeta(countResult.rows[0].count, page, limit),
  });
});

// ─── Update Waitlist Status (Admin) ───

const updateWaitlistStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const result = await db.query(
    `UPDATE waitlist SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Waitlist entry not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { waitlist: result.rows[0] },
  });

  if (result.rows[0].email && status === 'contacted') {
    emailService.sendWaitlistStatusUpdate(result.rows[0].email, result.rows[0], status);
  }
});

const deleteWaitlist = catchAsync(async (req, res, next) => {
  const result = await db.query(
    'UPDATE waitlist SET is_deleted = true WHERE id = $1 RETURNING id',
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Waitlist entry not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  submitWaitlist,
  getAllWaitlist,
  updateWaitlistStatus,
  deleteWaitlist,
};
