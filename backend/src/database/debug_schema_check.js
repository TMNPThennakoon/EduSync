const pool = require('../config/database');

const checkSchema = async () => {
    try {
        await pool.connect();

        console.log('--- Checking CLASSES table ---');
        const classesRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'classes';
    `);
        console.table(classesRes.rows);

        console.log('\n--- Checking ANNOUNCEMENTS table ---');
        const annRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'announcements';
    `);
        console.table(annRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
};

checkSchema();
