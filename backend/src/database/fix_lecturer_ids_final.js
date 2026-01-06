const pool = require('../config/database');

const fixLecturerIdsFinal = async () => {
    try {
        console.log('🔧 Final Fix for lecturer_ids table...');

        // 1. Ensure department column exists
        const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lecturer_ids' AND column_name = 'department'
    `);

        if (checkColumn.rows.length === 0) {
            console.log('   Adding department column...');
            await pool.query('ALTER TABLE lecturer_ids ADD COLUMN department VARCHAR(10)');
        } else {
            console.log('   Department column confirmed.');
        }

        // 2. Data Clean-up (Migration)
        console.log('📦 Re-formatting unused legacy IDs...');

        // Find all unused IDs that do NOT follow the new format (IAxxxx, ICxxxx, ATxxxx, ETxxxx)
        // We check for IDs involving 'LEC-' or NULL department
        const unusedIds = await pool.query(`
      SELECT id, lecturer_id 
      FROM lecturer_ids 
      WHERE is_used = false 
        AND (department IS NULL OR lecturer_id LIKE 'LEC-%')
      ORDER BY created_at ASC
    `);

        console.log(`   Found ${unusedIds.rows.length} legacy IDs to re-format.`);

        // Re-format strategies:
        // If we have existing IDs, we want to start replacing them sequentially from IAT (default)
        // or maybe round-robin? The user prompt implied just "rename them based on their department".
        // But they DON'T HAVE a department yet.
        // So we will default them to IAT as done before, OR purely optional:
        // "rename them to the new format based on their department" -> implied if they HAD one.
        // Since they don't, and IAT is the first option, let's assign them to IAT to be safe and clean.

        const prefix = 'IA';
        const dept = 'IAT';

        // We must find the CURRENT MAX IAT ID to start appending cleanly if mixed data exists.
        // However, since we are re-formatting 'legacy' ones, we should just overwrite them?
        // User said: "rename them to the new format".
        // Let's create a fresh sequence starting from whatever is currently the MAX numeric part in IAT.

        const maxIdRes = await pool.query(`SELECT lecturer_id FROM lecturer_ids WHERE department = 'IAT' ORDER BY lecturer_id DESC LIMIT 1`);
        let currentNumber = 0;
        if (maxIdRes.rows.length > 0) {
            // Check if it matches IAxxxx
            if (maxIdRes.rows[0].lecturer_id.startsWith('IA')) {
                currentNumber = parseInt(maxIdRes.rows[0].lecturer_id.replace(/\D/g, '')) || 0;
            }
        }

        for (const row of unusedIds.rows) {
            currentNumber++;
            const newIdString = `${prefix}${String(currentNumber).padStart(4, '0')}`;

            await pool.query(`
            UPDATE lecturer_ids 
            SET lecturer_id = $1, department = $2 
            WHERE id = $3
        `, [newIdString, dept, row.id]);

            console.log(`   Re-formatted ID ${row.id}: ${row.lecturer_id} -> ${newIdString}`);
        }

        console.log('✅ Final fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
};

fixLecturerIdsFinal();
