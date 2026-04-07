const catchAsync = require('../utils/catchAsync');
const db = require('../config/database');

const getDashboardStats = catchAsync(async (req, res) => {
  // 1. Total Revenue (Paid Orders)
  const revenueResult = await db.query(
    "SELECT SUM(total) as total FROM orders WHERE payment_status = 'paid'"
  );
  const totalRevenue = parseFloat(revenueResult.rows[0].total || 0);

  // 2. Active Bookings (Confirmed)
  const bookingsResult = await db.query(
    "SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'"
  );
  const activeBookings = parseInt(bookingsResult.rows[0].count || 0);

  // 3. Total Clients (Customers)
  const clientsResult = await db.query(
    "SELECT COUNT(*) as count FROM users WHERE user_type = 'customer'"
  );
  const totalClients = parseInt(clientsResult.rows[0].count || 0);

  // 4. Hours Booked (Average 1.5h per confirmed booking)
  const hoursBooked = activeBookings * 1.5;

  // 5. Recent Revenue Change (Mock for now, or compare with last month)
  const revenueChange = "+12%"; // Placeholder for trend analysis
  const bookingsChange = "+5%";
  const clientsChange = "+18%";
  const hoursChange = "+2%";

  res.status(200).json({
    status: 'success',
    data: {
      stats: [
        { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, change: revenueChange, icon: 'DollarSign' },
        { label: 'Active Bookings', value: activeBookings.toString(), change: bookingsChange, icon: 'CalendarCheck' },
        { label: 'New Clients', value: totalClients.toString(), change: clientsChange, icon: 'Users' },
        { label: 'Hours Booked', value: hoursBooked.toString(), change: hoursChange, icon: 'Clock' },
      ]
    }
  });
});

module.exports = {
  getDashboardStats,
};
