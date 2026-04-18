const catchAsync = require('../utils/catchAsync');
const db = require('../config/database');

const getBusinessReport = catchAsync(async (req, res) => {
  const { timeframe = '30d' } = req.query;
  
  let days = 30;
  if (timeframe === '7d') days = 7;
  if (timeframe === '90d') days = 90;
  if (timeframe === '12m') days = 365;

  // 1. Revenue Aggregation (Bookings + Orders)
  const bookingRev = await db.query(
    "SELECT SUM(total_price) as total FROM bookings WHERE (status = 'confirmed' OR status = 'completed') AND created_at >= NOW() - interval '1 day' * $1",
    [days]
  );

  const orderRev = await db.query(
    "SELECT SUM(total) as total FROM orders WHERE payment_status = 'paid' AND created_at >= NOW() - interval '1 day' * $1",
    [days]
  );

  const totalBookingRevenue = parseFloat(bookingRev.rows[0].total || 0);
  const totalOrderRevenue = parseFloat(orderRev.rows[0].total || 0);

  // 2. Waitlist Conversion
  const waitlistStats = await db.query(
    `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'booked') as converted
     FROM waitlist WHERE created_at >= NOW() - interval '1 day' * $1`,
    [days]
  );
  
  const waitlistTotal = parseInt(waitlistStats.rows[0].total || 0);
  const waitlistConverted = parseInt(waitlistStats.rows[0].converted || 0);
  const conversionRate = waitlistTotal > 0 ? (waitlistConverted / waitlistTotal) * 100 : 0;

  // 3. Coupon Usage
  const couponStats = await db.query(
    `SELECT 
        c.code, 
        COUNT(o.id) as usage_count,
        SUM(o.discount_amount) as total_discount
     FROM orders o
     JOIN coupons c ON o.coupon_code = c.code
     WHERE o.created_at >= NOW() - interval '1 day' * $1
     GROUP BY c.code
     ORDER BY usage_count DESC
     LIMIT 5`,
    [days]
  );

  // 4. Daily Revenue Trajectory (Combined)
  const trajectory = await db.query(
    `SELECT 
        date_trunc('day', created_at) as day,
        SUM(revenue) as total
     FROM (
       SELECT created_at, total_price as revenue FROM bookings WHERE (status = 'confirmed' OR status = 'completed')
       UNION ALL
       SELECT created_at, total as revenue FROM orders WHERE payment_status = 'paid'
     ) as combined
     WHERE created_at >= NOW() - interval '1 day' * $1
     GROUP BY day
     ORDER BY day ASC`,
    [days]
  );

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalRevenue: totalBookingRevenue + totalOrderRevenue,
        bookingRevenue: totalBookingRevenue,
        orderRevenue: totalOrderRevenue,
        conversionRate: conversionRate.toFixed(1) + '%',
        waitlistTotal,
        waitlistConverted
      },
      topCoupons: couponStats.rows,
      trajectory: trajectory.rows
    }
  });
});

const getStaffReport = catchAsync(async (req, res) => {
  const { timeframe = '30d' } = req.query;
  let days = 30;
  if (timeframe === '7d') days = 7;
  if (timeframe === '12m') days = 365;

  const staffPerformance = await db.query(
    `SELECT 
        s.name,
        s.role,
        COUNT(b.id) as total_bookings,
        SUM(b.total_price) FILTER (WHERE b.status = 'completed' OR b.status = 'confirmed') as revenue,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancellations
     FROM staff s
     LEFT JOIN bookings b ON s.id = b.staff_id
     WHERE (b.created_at IS NULL OR b.created_at >= NOW() - interval '1 day' * $1)
     AND s.is_deleted = false
     GROUP BY s.id, s.name, s.role
     ORDER BY revenue DESC NULLS LAST`,
    [days]
  );

  res.status(200).json({
    status: 'success',
    data: {
      staff: staffPerformance.rows
    }
  });
});

module.exports = {
  getBusinessReport,
  getStaffReport
};
