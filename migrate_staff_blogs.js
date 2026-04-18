const db = require('./src/config/database');

const migrate = async () => {
  try {
    console.log('Starting migration: Staff Portfolio & Blogs...');

    // 1. Update Staff table
    await db.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS experience_years VARCHAR(20),
      ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
    `);
    console.log('Staff table updated.');

    // 2. Create Staff Blogs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_blogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        image_url TEXT,
        status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Staff_blogs table created.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
