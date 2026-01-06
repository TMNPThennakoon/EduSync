const pool = require('../config/database');

const addUpdatedAtColumn = async () => {
    try {
        console.log('Checking for updated_at column in attendance_sessions table...');

        // Check if column exists
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance_sessions' AND column_name = 'updated_at'
    `;

        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length === 0) {
            console.log('Adding updated_at column...');
            await pool.query(`
        ALTER TABLE attendance_sessions 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
            console.log('✅ Column updated_at added successfully.');
        } else {
            console.log('ℹ️ Column updated_at already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding column:', error);
        process.exit(1);
    }
};

addUpdatedAtColumn();
