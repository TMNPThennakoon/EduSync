const pool = require('../config/database');

async function fixAssignmentsSchema() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Checking and fixing "assignments" table schema...');

        // 1. Rename columns if they exist with old names
        // Check for max_marks
        const resMarks = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='assignments' AND column_name='max_marks'");
        if (resMarks.rows.length > 0) {
            console.log('RENAME: max_marks -> max_score');
            await client.query('ALTER TABLE assignments RENAME COLUMN max_marks TO max_score');
        }

        // Check for type
        const resType = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='assignments' AND column_name='type'");
        if (resType.rows.length > 0) {
            console.log('RENAME: type -> assignment_type');
            await client.query('ALTER TABLE assignments RENAME COLUMN type TO assignment_type');
        }

        // 2. Add missing columns
        const columnsToAdd = [
            { name: 'department', type: 'VARCHAR(50)' },
            { name: 'attachment_url', type: 'TEXT' },
            { name: 'attachment_filename', type: 'TEXT' },
            { name: 'attachment_size', type: 'INTEGER' }
        ];

        for (const col of columnsToAdd) {
            const resCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='assignments' AND column_name=$1", [col.name]);
            if (resCol.rows.length === 0) {
                console.log(`ADD: ${col.name}`);
                await client.query(`ALTER TABLE assignments ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`EXISTS: ${col.name}`);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Assignments schema fixed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

fixAssignmentsSchema();
