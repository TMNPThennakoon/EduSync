const pool = require('../config/database');

const addGeneratedByColumn = async () => {
    try {
        console.log('🔧 Fixing lecturer_ids schema: Adding generated_by column...');

        // Check if column exists
        const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lecturer_ids' AND column_name = 'generated_by'
    `);

        if (checkColumn.rows.length === 0) {
            console.log('   Adding generated_by column (INTEGER REFERENCES users(id))...');
            // Assuming generated_by refers to the admin user's ID (which is usually integer/serial in this schema based on users table)
            // If users.id is UUID, we should use UUID. But earlier logs showed user ID '1', so it's INTEGER.
            await pool.query('ALTER TABLE lecturer_ids ADD COLUMN generated_by INTEGER');
            console.log('   Column added successfully.');
        } else {
            console.log('   Column generated_by already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Schema Fix failed:', error);
        process.exit(1);
    }
};

addGeneratedByColumn();
