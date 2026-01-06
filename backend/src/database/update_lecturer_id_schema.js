const pool = require('../config/database');

const updateLecturerIdSchema = async () => {
    try {
        console.log('🔧 Updating lecturer_ids table schema...');

        // 1. Add department column if it doesn't exist
        const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lecturer_ids' AND column_name = 'department'
    `);

        if (checkColumn.rows.length === 0) {
            console.log('   Adding department column...');
            await pool.query('ALTER TABLE lecturer_ids ADD COLUMN department VARCHAR(10)');
        } else {
            console.log('   Department column already exists.');
        }

        // 2. Data Migration: Re-format unused IDs
        console.log('📦 Migrating unused IDs...');

        // Get all unused IDs that don't satisfy the new format (e.g., don't start with IA, IC, AT, ET)
        // Actually, we'll just target those with null department or the old random format 'LEC-%'
        const unusedIds = await pool.query(`
      SELECT id, lecturer_id 
      FROM lecturer_ids 
      WHERE is_used = false 
        AND (department IS NULL OR lecturer_id LIKE 'LEC-%')
      ORDER BY created_at ASC
    `);

        console.log(`   Found ${unusedIds.rows.length} legacy unused IDs to re-format.`);

        // Re-format them to IAT (IA0001, etc.) as a default cleanup strategy
        const prefix = 'IA';
        const dept = 'IAT';

        for (let i = 0; i < unusedIds.rows.length; i++) {
            const id = unusedIds.rows[i].id;
            const newIdString = `${prefix}${String(i + 1).padStart(4, '0')}`;

            await pool.query(`
            UPDATE lecturer_ids 
            SET lecturer_id = $1, department = $2 
            WHERE id = $3
        `, [newIdString, dept, id]);

            console.log(`   Updated ID ${id} -> ${newIdString}`);
        }

        console.log('✅ Schema update and migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

updateLecturerIdSchema();
