const db = require('../../config/database');
const logger = require('../../utils/logger');

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  user_type VARCHAR(20) CHECK (user_type IN ('needy', 'helper', 'verifier')) NOT NULL,
  verification_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_city_area ON users(city, area);
`;

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    await db.query(createUsersTable);
    logger.info('✓ Users table created');

    logger.info('All migrations completed successfully! ✨');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
