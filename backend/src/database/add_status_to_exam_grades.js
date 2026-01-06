const pool = require('../config/database');

async function addStatusColumn() {
    try {
        // Check if column exists
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='exam_grades' AND column_name='status'
    `);

        if (res.rows.length === 0) {
            console.log('Adding status column...');
            await pool.query(`
        ALTER TABLE exam_grades 
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
      `);
            console.log('Status column added.');
        } else {
            console.log('Status column already exists.');
        }
    } catch (err) {
        console.error('Error adding status column:', err);
    } finally {
        pool.end();
    }
}

addStatusColumn();
