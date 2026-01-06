const { Pool, types } = require('pg');
require('dotenv').config();

// Force integer parsing for BIGINT (to avoid strings for counts/ids)
types.setTypeParser(20, (val) => parseInt(val, 10));

// Cloud database configuration
// Supports DATABASE_URL (for services like Neon, Supabase, Railway, Render)
// or individual credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
const poolConfig = process.env.DATABASE_URL
  ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for most cloud databases
  }
  : {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };

// Validate configuration
if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER)) {
  console.error('❌ Database configuration missing!');
  console.error('Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER in your .env file');
  process.exit(1);
}

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
  if (process.env.DATABASE_URL) {
    console.log('📡 Using cloud database connection');
  } else {
    console.log(`📡 Connected to: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  }
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

module.exports = pool;
