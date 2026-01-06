const pool = require('../config/database');

// Tables that are actually used by the application (from migrate.js)
const USED_TABLES = [
  'users',
  'classes',
  'enrollments',
  'attendance',
  'assignments',
  'assignment_submissions',
  'grades',
  'lecturer_ids'
];

const dropUnusedTables = async () => {
  try {
    console.log('🔍 Checking for unused tables...\n');

    // Get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE' 
      ORDER BY table_name
    `);

    const allTables = result.rows.map(row => row.table_name);
    const unusedTables = allTables.filter(table => !USED_TABLES.includes(table));

    if (unusedTables.length === 0) {
      console.log('✅ No unused tables found. All tables are in use.');
      return;
    }

    console.log('📋 Used tables:');
    USED_TABLES.forEach(table => {
      if (allTables.includes(table)) {
        console.log(`  ✅ ${table}`);
      }
    });

    console.log('\n🗑️  Unused tables to be dropped:');
    unusedTables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });

    console.log(`\n⚠️  WARNING: This will permanently delete ${unusedTables.length} table(s) and all their data!`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Drop unused tables
    for (const table of unusedTables) {
      try {
        console.log(`🗑️  Dropping table: ${table}...`);
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ Dropped: ${table}`);
      } catch (error) {
        console.error(`   ❌ Error dropping ${table}:`, error.message);
      }
    }

    console.log('\n✅ Cleanup completed!');
    console.log(`   Dropped ${unusedTables.length} unused table(s).`);
  } catch (error) {
    console.error('❌ Error dropping unused tables:', error);
    throw error;
  }
};

if (require.main === module) {
  dropUnusedTables()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to drop unused tables:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { dropUnusedTables };



