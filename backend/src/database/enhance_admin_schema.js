const pool = require('../config/database');

const adminSchemaMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting Admin Schema Migration...');

    // 1. Create action_logs table if it doesn't exist, or add columns
    console.log('Checking action_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS action_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add columns if they don't exist
    await client.query(`
      ALTER TABLE action_logs 
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
      ADD COLUMN IF NOT EXISTS device_info TEXT;
    `);
    console.log('Updated action_logs table.');

    // 2. Create announcements table
    console.log('Creating announcements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) CHECK (type IN ('info', 'warning', 'important')) DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    console.log('Created announcements table.');

    // 3. Create lecturer_ids table
    console.log('Creating lecturer_ids table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS lecturer_ids (
        id SERIAL PRIMARY KEY,
        lecturer_id_string VARCHAR(50) UNIQUE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP,
        used_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('Created lecturer_ids table.');

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
};

adminSchemaMigration();
