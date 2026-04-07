const catchAsync = require('../utils/catchAsync');
const db = require('../config/database');

const getSettings = catchAsync(async (req, res) => {
  const { key } = req.params;
  const result = await db.query('SELECT value FROM site_settings WHERE key = $1', [key]);

  res.status(200).json({
    status: 'success',
    data: result.rows[0] ? result.rows[0].value : null,
  });
});

const upsertSettings = catchAsync(async (req, res) => {
  const { key } = req.params;
  const value = req.body;

  const result = await db.query(
    `INSERT INTO site_settings (key, value) 
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [key, JSON.stringify(value)]
  );

  res.status(200).json({
    status: 'success',
    data: result.rows[0].value,
  });
});

const getBootstrapSettings = catchAsync(async (req, res) => {
  const result = await db.query(
    `SELECT key, value FROM site_settings 
     WHERE key IN ('hero_slides', 'marquee_items', 'expertise_section', 'footer_data')`
  );
  
  // Convert array of rows into a single key-value object
  const settings = result.rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  
  res.status(200).json({
    status: 'success',
    data: settings,
  });
});

module.exports = {
  getSettings,
  upsertSettings,
  getBootstrapSettings,
};
