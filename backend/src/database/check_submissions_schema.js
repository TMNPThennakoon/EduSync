const pool = require('../config/database');

const checkSchema = async () => {
    try {
        console.log('🔄 Checking Submissions Schema...');
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'submissions';
    `);
        console.log('Submissions Columns:', result.rows);

        console.log('\n🔄 Checking Assignments Schema...');
        const assignmentsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assignments';
    `);
        console.log('Assignments Columns:', assignmentsResult.rows);


        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkSchema();
