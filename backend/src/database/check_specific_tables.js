const pool = require('../config/database');

const checkSchemas = async () => {
    try {
        const tableNames = ['assignment_submissions', 'grades'];
        for (const tableName of tableNames) {
            console.log(`\nChecking ${tableName}...`);
            const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}';
      `);
            console.log(result.rows);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkSchemas();
