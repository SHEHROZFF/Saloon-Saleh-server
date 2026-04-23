const db = require('./src/config/database');

async function migrate() {
    try {
        console.log('Adding is_featured column to staff table...');
        await db.query('ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;');
        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
