const db = require('../../config/database');
const logger = require('../../utils/logger');

async function up() {
  try {
    logger.info('Running migration: add is_deleted to tables...');
    
    const tables = [
      'users', 
      'product_categories', 
      'products', 
      'service_categories', 
      'services', 
      'staff', 
      'time_slots', 
      'coupons', 
      'waitlist'
    ];

    for (const table of tables) {
      await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
      logger.info(`✓ Added is_deleted to ${table}`);
    }

    logger.info('✓ Migration complete: Soft Delete architecture applied');
  } catch (error) {
    logger.error('Error during migration:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  up().then(() => process.exit(0));
}

module.exports = { up };
