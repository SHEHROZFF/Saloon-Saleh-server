const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Migration: Add user_id to staff table
 * Links staff profiles to user login accounts.
 */
async function migrate() {
  try {
    logger.info('Running migration: add user_id to staff table...');

    // Add the column if it doesn't exist
    await db.query(`
      ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL
    `);

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id)
    `);

    logger.info('✓ Migration complete: user_id column added to staff table');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
