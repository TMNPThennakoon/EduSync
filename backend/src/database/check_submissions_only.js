const pool = require('../config/database');

const checkSubmissions = async () => {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'submissions';
    `);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkSubmissions();
