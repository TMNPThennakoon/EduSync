const pool = require('../config/database');

const listTables = async () => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log(result.rows.map(r => r.table_name));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

listTables();
