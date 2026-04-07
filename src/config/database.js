const { Pool } = require('pg');
const config = require('../config/config');
const logger = require('../utils/logger');

const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    min: config.database.pool.min,
    max: config.database.pool.max,
    ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
    logger.info('Database connection established');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error', err);
    process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('Database connection test failed:', err);
    } else {
        logger.info('Database connection test successful:', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool,
};
