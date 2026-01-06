const pool = require('../config/database');

const fixMaxScoreSchema = async () => {
    try {
        console.log('🔧 Fixing assignments table schema...');

        // 1. Check if max_score column exists
        const checkColumn = await pool.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'assignments' AND column_name = 'max_score'
    `);

        if (checkColumn.rows.length > 0) {
            console.log('Current schema for max_score:', checkColumn.rows[0]);
        } else {
            console.log('⚠️ max_score column not found! Checking for max_marks...');
            const checkMaxMarks = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'assignments' AND column_name = 'max_marks'
      `);
            if (checkMaxMarks.rows.length > 0) {
                console.log('Found max_marks instead. Renaming to max_score...');
                await pool.query('ALTER TABLE assignments RENAME COLUMN max_marks TO max_score');
            } else {
                console.log('Creating max_score column...');
                await pool.query('ALTER TABLE assignments ADD COLUMN max_score INTEGER DEFAULT 100');
            }
        }

        // 2. ALTER column to be INTEGER (safe for 100, 1000 etc)
        console.log('🔄 Altering max_score to INTEGER...');
        await pool.query('ALTER TABLE assignments ALTER COLUMN max_score TYPE INTEGER USING max_score::INTEGER');

        console.log('✅ Schema fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    }
};

fixMaxScoreSchema();
