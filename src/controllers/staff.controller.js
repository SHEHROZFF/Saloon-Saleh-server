const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');

const getAllStaff = catchAsync(async (req, res) => {
  const result = await db.query(
    `SELECT s.*,
       COALESCE(
         json_agg(json_build_object('id', svc.id, 'name', svc.name))
         FILTER (WHERE svc.id IS NOT NULL),
         '[]'
       ) AS services
     FROM staff s
     LEFT JOIN staff_services ss ON s.id = ss.staff_id
     LEFT JOIN services svc ON ss.service_id = svc.id
     WHERE s.is_active = true
     GROUP BY s.id
     ORDER BY s.sort_order ASC`
  );

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: { staff: result.rows },
  });
});

const getStaffMember = catchAsync(async (req, res, next) => {
  const result = await db.query(
    `SELECT s.*,
       COALESCE(
         json_agg(json_build_object('id', svc.id, 'name', svc.name, 'price', svc.price, 'duration', svc.duration))
         FILTER (WHERE svc.id IS NOT NULL),
         '[]'
       ) AS services
     FROM staff s
     LEFT JOIN staff_services ss ON s.id = ss.staff_id
     LEFT JOIN services svc ON ss.service_id = svc.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Staff member not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { staff: result.rows[0] },
  });
});

const createStaff = catchAsync(async (req, res) => {
  const { name, role, avatar_url, phone, email, is_active, sort_order, service_ids } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO staff (name, role, avatar_url, phone, email, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, role, avatar_url, phone, email, is_active, sort_order]
    );

    const staffMember = result.rows[0];

    // Link services if provided
    if (service_ids && service_ids.length > 0) {
      const insertValues = service_ids
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      await client.query(
        `INSERT INTO staff_services (staff_id, service_id) VALUES ${insertValues}`,
        [staffMember.id, ...service_ids]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      data: { staff: staffMember },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

const updateStaff = catchAsync(async (req, res, next) => {
  const { name, role, avatar_url, phone, email, is_active, sort_order, service_ids } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE staff SET
         name = COALESCE($1, name),
         role = COALESCE($2, role),
         avatar_url = COALESCE($3, avatar_url),
         phone = COALESCE($4, phone),
         email = COALESCE($5, email),
         is_active = COALESCE($6, is_active),
         sort_order = COALESCE($7, sort_order)
       WHERE id = $8
       RETURNING *`,
      [name, role, avatar_url, phone, email, is_active, sort_order, req.params.id]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return next(new AppError('Staff member not found', 404));
    }

    // Re-sync services if provided
    if (service_ids !== undefined) {
      await client.query('DELETE FROM staff_services WHERE staff_id = $1', [req.params.id]);

      if (service_ids.length > 0) {
        const insertValues = service_ids
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await client.query(
          `INSERT INTO staff_services (staff_id, service_id) VALUES ${insertValues}`,
          [req.params.id, ...service_ids]
        );
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      data: { staff: result.rows[0] },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

const deleteStaff = catchAsync(async (req, res, next) => {
  const result = await db.query('DELETE FROM staff WHERE id = $1 RETURNING id', [req.params.id]);

  if (!result.rows[0]) {
    return next(new AppError('Staff member not found', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

module.exports = {
  getAllStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  deleteStaff,
};
