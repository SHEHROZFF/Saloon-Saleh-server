const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const authUtils = require('../utils/auth');
const emailService = require('../utils/email');

const getAllStaff = catchAsync(async (req, res) => {
  const { search, all } = req.query;
  
  let query = `SELECT s.*,
       COALESCE(
         json_agg(json_build_object('id', svc.id, 'name', svc.name))
         FILTER (WHERE svc.id IS NOT NULL),
         '[]'
       ) AS services
     FROM staff s
     LEFT JOIN staff_services ss ON s.id = ss.staff_id
     LEFT JOIN services svc ON ss.service_id = svc.id`;

  const conditions = ['s.is_deleted = false'];
  const values = [];
  let paramIndex = 1;

  if (all !== 'true') {
    conditions.push('s.is_active = true');
  }

  if (req.query.featured === 'true') {
    conditions.push('s.is_featured = true');
  }

  if (search) {
    conditions.push(`(s.name ILIKE $${paramIndex} OR s.role ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  query += ` WHERE ${conditions.join(' AND ')} GROUP BY s.id ORDER BY s.sort_order ASC`;

  const result = await db.query(query, values);

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
     WHERE s.id = $1 AND s.is_deleted = false
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

const getMyStaffProfile = catchAsync(async (req, res, next) => {
  if (!req.staff_id) return next(new AppError('No staff profile linked to this user', 404));
  
  const result = await db.query('SELECT * FROM staff WHERE id = $1', [req.staff_id]);
  res.status(200).json({ status: 'success', data: { staff: result.rows[0] } });
});

const createStaff = catchAsync(async (req, res) => {
  const { name, role, avatar_url, phone, email, is_active, is_featured, sort_order, service_ids, bio, specialties, experience_years, instagram_url, linkedin_url } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await authUtils.hashPassword(tempPassword);
    
    let userId = null;
    if (email) {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password, user_type, phone)
         VALUES ($1, $2, $3, 'staff', $4)
         RETURNING id`,
        [name, email, hashedPassword, phone]
      );
      userId = userResult.rows[0].id;
    }

    const result = await client.query(
      `INSERT INTO staff (user_id, name, role, avatar_url, phone, email, is_active, is_featured, sort_order, bio, specialties, experience_years, instagram_url, linkedin_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [userId, name, role, avatar_url, phone, email, is_active, is_featured || false, sort_order, bio, specialties || '{}', experience_years, instagram_url, linkedin_url]
    );

    const staffMember = result.rows[0];

    if (service_ids && service_ids.length > 0) {
      const insertValues = service_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO staff_services (staff_id, service_id) VALUES ${insertValues}`,
        [staffMember.id, ...service_ids]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ status: 'success', data: { staff: staffMember } });

    if (email) emailService.sendStaffWelcomeEmail(email, name, tempPassword);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

const updateStaff = catchAsync(async (req, res, next) => {
  const staffId = req.params.id;
  const { name, role, avatar_url, phone, email, is_active, is_featured, sort_order, service_ids, bio, specialties, experience_years, instagram_url, linkedin_url } = req.body;
  
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
          is_featured = COALESCE($7, is_featured),
          sort_order = COALESCE($8, sort_order),
          bio = COALESCE($9, bio),
          specialties = COALESCE($10, specialties),
          experience_years = COALESCE($11, experience_years),
          instagram_url = COALESCE($12, instagram_url),
          linkedin_url = COALESCE($13, linkedin_url)
        WHERE id = $14
        RETURNING *`,
       [name, role, avatar_url, phone, email, is_active, is_featured, sort_order, bio, specialties, experience_years, instagram_url, linkedin_url, staffId]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return next(new AppError('Staff member not found', 404));
    }

    if (result.rows[0].user_id) {
      await client.query(
        `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone) WHERE id = $4`,
        [name, email, phone, result.rows[0].user_id]
      );
    }

    if (service_ids !== undefined) {
      await client.query('DELETE FROM staff_services WHERE staff_id = $1', [staffId]);
      if (service_ids.length > 0) {
        const insertValues = service_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(`INSERT INTO staff_services (staff_id, service_id) VALUES ${insertValues}`, [staffId, ...service_ids]);
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ status: 'success', data: { staff: result.rows[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

const updateMyStaffProfile = catchAsync(async (req, res, next) => {
  if (!req.staff_id) return next(new AppError('No staff profile linked to this user', 403));
  
  // Reuse updateStaff logic but for self
  req.params.id = req.staff_id;
  return updateStaff(req, res, next);
});

const deleteStaff = catchAsync(async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const staffResult = await client.query('SELECT user_id FROM staff WHERE id = $1', [req.params.id]);
    if (!staffResult.rows[0]) {
      await client.query('ROLLBACK');
      return next(new AppError('Staff member not found', 404));
    }
    const userId = staffResult.rows[0].user_id;
    await client.query('UPDATE staff SET is_deleted = true, is_active = false WHERE id = $1', [req.params.id]);
    if (userId) await client.query('UPDATE users SET is_deleted = true, is_active = false WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

module.exports = {
  getAllStaff,
  getStaffMember,
  getMyStaffProfile,
  createStaff,
  updateStaff,
  updateMyStaffProfile,
  deleteStaff,
};
