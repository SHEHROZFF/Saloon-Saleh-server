const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { parsePagination, buildPaginationMeta } = require('../utils/queryHelpers');
const emailService = require('../utils/email');

// ─── Create Booking (from 6-step wizard) ───

const createBooking = catchAsync(async (req, res) => {
  const {
    gender, service_ids, staff_id, booking_date,
    time_slot_id, first_name, last_name, email, phone, notes,
  } = req.body;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Check for conflict: same staff + date + time slot
    if (staff_id) {
      const conflict = await client.query(
        `SELECT id FROM bookings
         WHERE staff_id = $1 AND booking_date = $2 AND time_slot_id = $3
         AND status NOT IN ('cancelled', 'no_show') AND is_deleted = false`,
        [staff_id, booking_date, time_slot_id]
      );

      if (conflict.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          status: 'fail',
          message: 'This time slot is already booked for the selected professional. Please choose a different time or professional.',
        });
      }
    }

    // 2. Fetch service prices for total calculation
    const serviceResult = await client.query(
      `SELECT id, price FROM services WHERE id = ANY($1)`,
      [service_ids]
    );

    const totalPrice = serviceResult.rows.reduce((sum, s) => sum + parseFloat(s.price), 0);

    // 3. Create booking
    const userId = req.user ? req.user.id : null;

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, gender, staff_id, booking_date, time_slot_id, first_name, last_name, email, phone, notes, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, gender, staff_id, booking_date, time_slot_id, first_name, last_name, email, phone, notes, totalPrice]
    );

    const booking = bookingResult.rows[0];

    // 4. Insert booking_services junction rows
    for (const svc of serviceResult.rows) {
      await client.query(
        `INSERT INTO booking_services (booking_id, service_id, price_at_booking)
         VALUES ($1, $2, $3)`,
        [booking.id, svc.id, svc.price]
      );
    }

    await client.query('COMMIT');

    // 5. Fetch full booking with services and time slot for response
    const fullBooking = await db.query(
      `SELECT b.*,
         ts.display_label AS time_label,
         st.name AS staff_name,
         COALESCE(
           json_agg(json_build_object('id', svc.id, 'name', svc.name, 'price', bs.price_at_booking))
           FILTER (WHERE svc.id IS NOT NULL),
           '[]'
         ) AS services
       FROM bookings b
       LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
       LEFT JOIN staff st ON b.staff_id = st.id
       LEFT JOIN booking_services bs ON b.id = bs.booking_id
       LEFT JOIN services svc ON bs.service_id = svc.id
       WHERE b.id = $1
       GROUP BY b.id, ts.display_label, st.name`,
      [booking.id]
    );

    res.status(201).json({
      status: 'success',
      data: { booking: fullBooking.rows[0] },
    });

    // Send Booking Confirmation Email asynchronously
    if (fullBooking.rows[0].email) {
      emailService.sendBookingConfirmation(fullBooking.rows[0].email, fullBooking.rows[0]);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// ─── Get All Bookings (Admin) ───

const getAllBookings = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { status, date, staff_id } = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT b.*, ts.display_label AS time_label, st.name AS staff_name
    FROM bookings b
    LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
    LEFT JOIN staff st ON b.staff_id = st.id`;

  let countQuery = 'SELECT COUNT(*) FROM bookings b';

  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`b.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }
  if (date) {
    conditions.push(`b.booking_date = $${paramIndex}`);
    values.push(date);
    paramIndex++;
  }
  if (staff_id) {
    conditions.push(`b.staff_id = $${paramIndex}`);
    values.push(staff_id);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  query += `${whereClause} ORDER BY b.booking_date DESC, ts.slot_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  countQuery += whereClause;

  const [dataResult, countResult] = await Promise.all([
    db.query(query, [...values, limit, offset]),
    db.query(countQuery, values),
  ]);

  res.status(200).json({
    status: 'success',
    data: { bookings: dataResult.rows },
    pagination: buildPaginationMeta(countResult.rows[0].count, page, limit),
  });
});

// ─── Get My Bookings ───

const getMyBookings = catchAsync(async (req, res) => {
  const result = await db.query(
    `SELECT b.*, ts.display_label AS time_label, st.name AS staff_name,
       COALESCE(
         json_agg(json_build_object('name', svc.name, 'price', bs.price_at_booking))
         FILTER (WHERE svc.id IS NOT NULL),
         '[]'
       ) AS services
     FROM bookings b
     LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
     LEFT JOIN staff st ON b.staff_id = st.id
     LEFT JOIN booking_services bs ON b.id = bs.booking_id
     LEFT JOIN services svc ON bs.service_id = svc.id
     WHERE b.user_id = $1
     GROUP BY b.id, ts.display_label, st.name
     ORDER BY b.booking_date DESC`,
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: { bookings: result.rows },
  });
});

// ─── Get Single Booking ───

const getBooking = catchAsync(async (req, res, next) => {
  const result = await db.query(
    `SELECT b.*, ts.display_label AS time_label, st.name AS staff_name,
       COALESCE(
         json_agg(json_build_object('id', svc.id, 'name', svc.name, 'price', bs.price_at_booking))
         FILTER (WHERE svc.id IS NOT NULL),
         '[]'
       ) AS services
     FROM bookings b
     LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
     LEFT JOIN staff st ON b.staff_id = st.id
     LEFT JOIN booking_services bs ON b.id = bs.booking_id
     LEFT JOIN services svc ON bs.service_id = svc.id
     WHERE b.id = $1
     GROUP BY b.id, ts.display_label, st.name`,
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { booking: result.rows[0] },
  });
});

// ─── Update Booking Status ───

const updateBookingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const result = await db.query(
    `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { booking: result.rows[0] },
  });

  // Send Status Update Email asynchronously
  if (result.rows[0].email) {
    emailService.sendBookingStatusUpdate(result.rows[0].email, result.rows[0], status);
  }
});

// ─── Check Availability ───

const checkAvailability = catchAsync(async (req, res) => {
  const { date, staff_id } = req.query;

  if (!date) {
    return res.status(400).json({
      status: 'fail',
      message: 'Date is required to check availability.',
    });
  }

  // Get all active time slots
  const allSlots = await db.query(
    'SELECT * FROM time_slots WHERE is_active = true AND is_deleted = false ORDER BY sort_order ASC'
  );

  // Get booked slots for the given date (and optionally staff)
  let bookedQuery = `SELECT time_slot_id FROM bookings
    WHERE booking_date = $1 AND status NOT IN ('cancelled', 'no_show')`;
  const bookedValues = [date];

  if (staff_id) {
    bookedQuery += ' AND staff_id = $2';
    bookedValues.push(staff_id);
  }

  const bookedSlots = await db.query(bookedQuery, bookedValues);
  const bookedIds = new Set(bookedSlots.rows.map((r) => r.time_slot_id));

  // Mark each slot as available or not
  const availability = allSlots.rows.map((slot) => ({
    ...slot,
    is_available: !bookedIds.has(slot.id),
  }));

  res.status(200).json({
    status: 'success',
    data: { date, staff_id: staff_id || null, slots: availability },
  });
});

// ─── Get Time Slots ───

const getTimeSlots = catchAsync(async (req, res) => {
  const result = await db.query(
    'SELECT * FROM time_slots WHERE is_active = true AND is_deleted = false ORDER BY sort_order ASC'
  );

  res.status(200).json({
    status: 'success',
    data: { time_slots: result.rows },
  });
});

// ─── Get Staff Member's Assigned Bookings ───

const getStaffMyBookings = catchAsync(async (req, res, next) => {
  // 1. Resolve logged-in user → staff profile via user_id FK
  const staffResult = await db.query(
    'SELECT id FROM staff WHERE user_id = $1',
    [req.user.id]
  );

  if (!staffResult.rows[0]) {
    return next(new AppError('No staff profile linked to your account. Contact your administrator.', 404));
  }

  const staffId = staffResult.rows[0].id;

  // 2. Fetch all bookings assigned to this staff member
  const result = await db.query(
    `SELECT b.*, ts.display_label AS time_label, st.name AS staff_name,
       COALESCE(
         json_agg(json_build_object('name', svc.name, 'price', bs.price_at_booking))
         FILTER (WHERE svc.id IS NOT NULL),
         '[]'
       ) AS services
     FROM bookings b
     LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
     LEFT JOIN staff st ON b.staff_id = st.id
     LEFT JOIN booking_services bs ON b.id = bs.booking_id
     LEFT JOIN services svc ON bs.service_id = svc.id
     WHERE b.staff_id = $1
     GROUP BY b.id, ts.display_label, ts.slot_time, st.name
     ORDER BY b.booking_date DESC, ts.slot_time ASC`,
    [staffId]
  );

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: { bookings: result.rows },
  });
});

// ─── Update Booking Status (Staff — with ownership check) ───

const updateStaffBookingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  // 1. Resolve logged-in user → staff profile
  const staffResult = await db.query(
    'SELECT id FROM staff WHERE user_id = $1',
    [req.user.id]
  );

  if (!staffResult.rows[0]) {
    return next(new AppError('No staff profile linked to your account.', 404));
  }

  // 2. Verify this booking belongs to this staff member
  const bookingCheck = await db.query(
    'SELECT id FROM bookings WHERE id = $1 AND staff_id = $2',
    [req.params.id, staffResult.rows[0].id]
  );

  if (!bookingCheck.rows[0]) {
    return next(new AppError('Booking not found or not assigned to you.', 403));
  }

  // 3. Update status
  const result = await db.query(
    'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );

  res.status(200).json({
    status: 'success',
    data: { booking: result.rows[0] },
  });

  // Send Status Update Email asynchronously
  if (result.rows[0].email) {
    emailService.sendBookingStatusUpdate(result.rows[0].email, result.rows[0], status);
  }
});

const deleteBooking = catchAsync(async (req, res, next) => {
  const result = await db.query(
    'DELETE FROM bookings WHERE id = $1 RETURNING id',
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const updateBookingDetails = catchAsync(async (req, res, next) => {
  const {
    gender, service_ids, staff_id, booking_date,
    time_slot_id, first_name, last_name, email, phone, notes,
  } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Check conflict if date/time/staff changed
    const conflict = await client.query(
      `SELECT id FROM bookings
       WHERE staff_id = $1 AND booking_date = $2 AND time_slot_id = $3
       AND status NOT IN ('cancelled', 'no_show') AND id != $4`,
      [staff_id, booking_date, time_slot_id, req.params.id]
    );

    if (conflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        status: 'fail',
        message: 'This time slot is already booked for the selected professional. Please choose a different time or professional.',
      });
    }

    // 2. Compute total price again if services changed
    let totalPrice = 0;
    let serviceResult = { rows: [] };
    
    if (service_ids && service_ids.length > 0) {
      serviceResult = await client.query(
        `SELECT id, price FROM services WHERE id = ANY($1)`,
        [service_ids]
      );
      totalPrice = serviceResult.rows.reduce((sum, s) => sum + parseFloat(s.price), 0);
    }

    // 3. Update main booking row
    const bookingResult = await client.query(
      `UPDATE bookings SET 
         gender = COALESCE($1, gender),
         staff_id = COALESCE($2, staff_id),
         booking_date = COALESCE($3, booking_date),
         time_slot_id = COALESCE($4, time_slot_id),
         first_name = COALESCE($5, first_name),
         last_name = COALESCE($6, last_name),
         email = COALESCE($7, email),
         phone = COALESCE($8, phone),
         notes = COALESCE($9, notes),
         total_price = CASE WHEN $10 > 0 THEN $10 ELSE total_price END
       WHERE id = $11
       RETURNING *`,
      [gender, staff_id, booking_date, time_slot_id, first_name, last_name, email, phone, notes, totalPrice, req.params.id]
    );

    if (!bookingResult.rows[0]) {
      await client.query('ROLLBACK');
      return next(new AppError('Booking not found', 404));
    }

    const booking = bookingResult.rows[0];

    // 4. Update services if provided
    if (service_ids && service_ids.length > 0) {
      await client.query('DELETE FROM booking_services WHERE booking_id = $1', [booking.id]);
      
      for (const svc of serviceResult.rows) {
        await client.query(
          `INSERT INTO booking_services (booking_id, service_id, price_at_booking)
           VALUES ($1, $2, $3)`,
          [booking.id, svc.id, svc.price]
        );
      }
    }

    await client.query('COMMIT');

    // 5. Fetch full booking
    const fullBooking = await db.query(
      `SELECT b.*,
         ts.display_label AS time_label,
         st.name AS staff_name,
         COALESCE(
           json_agg(json_build_object('id', svc.id, 'name', svc.name, 'price', bs.price_at_booking))
           FILTER (WHERE svc.id IS NOT NULL),
           '[]'
         ) AS services
       FROM bookings b
       LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
       LEFT JOIN staff st ON b.staff_id = st.id
       LEFT JOIN booking_services bs ON b.id = bs.booking_id
       LEFT JOIN services svc ON bs.service_id = svc.id
       WHERE b.id = $1
       GROUP BY b.id, ts.display_label, st.name`,
      [booking.id]
    );

    res.status(200).json({
      status: 'success',
      data: { booking: fullBooking.rows[0] },
    });

    // Send Rescheduled/Modified Email asynchronously
    if (fullBooking.rows[0].email) {
      emailService.sendBookingDetailsModifiedEmail(fullBooking.rows[0].email, fullBooking.rows[0]);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

module.exports = {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  updateBookingDetails,
  deleteBooking,
  checkAvailability,
  getTimeSlots,
  getStaffMyBookings,
  updateStaffBookingStatus,
};
