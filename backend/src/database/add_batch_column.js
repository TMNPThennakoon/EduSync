const pool = require('../config/database');

const addBatchColumn = async () => {
    try {
        console.log('Adding batch column to users table...');

        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS batch VARCHAR(20);
    `);

        console.log('Batch column added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error adding batch column:', error);
        process.exit(1);
    }
};

addBatchColumn();
