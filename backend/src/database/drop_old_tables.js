const pool = require('../config/database');

const dropOldTables = async () => {
  try {
    console.log('🗑️  Dropping old tables...\n');

    const oldTables = [
      'assignment_submissions',
      'attendance',
      'classes'
    ];

    for (const table of oldTables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ Dropped: ${table}`);
      } catch (error) {
        console.log(`   ❌ Error dropping ${table}:`, error.message);
      }
    }

    console.log('\n✅ Old tables cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

if (require.main === module) {
  dropOldTables()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { dropOldTables };



