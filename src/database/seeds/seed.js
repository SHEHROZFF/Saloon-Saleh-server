const db = require('../../config/database');
const logger = require('../../utils/logger');
const { hashPassword } = require('../../utils/auth');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Seed users
    const hashedPassword = await hashPassword('password123');

    await db.query(`
      INSERT INTO users (name, email, password, phone, city, area, user_type)
      VALUES 
        ('Admin User', 'admin@example.com', $1, '1234567890', 'Karachi', 'Gulshan', 'helper'),
        ('Verifier User', 'verifier@example.com', $1, '1234567891', 'Karachi', 'Clifton', 'verifier'),
        ('Needy Person', 'needy@example.com', $1, '1234567892', 'Karachi', 'Saddar', 'needy')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    logger.info('✓ Users seeded');

    logger.info('Database seeding completed successfully! ✨');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
