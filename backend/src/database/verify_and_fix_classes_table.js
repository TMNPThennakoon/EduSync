const pool = require('../config/database');

const verifyAndFixClassesTable = async () => {
  try {
    console.log('🔍 Verifying classes table structure...\n');

    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'classes'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Classes table does not exist! Creating it...\n');
      await recreateTable();
      return;
    }

    // Check columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Current columns in classes table:');
    if (columns.rows.length === 0) {
      console.log('   ❌ No columns found! Table might be corrupted.');
      console.log('   🔄 Recreating table...\n');
      await recreateTable();
      return;
    }

    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Expected columns
    const expectedColumns = [
      'class_code',
      'class_name',
      'department',
      'lecturer_id',
      'created_at',
      'updated_at'
    ];

    const existingColumnNames = columns.rows.map(c => c.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
      console.log('🔄 Recreating table with correct structure...\n');
      await recreateTable();
      return;
    }

    // Check for data
    const rowCount = await pool.query('SELECT COUNT(*) as count FROM classes');
    console.log(`\n📊 Row count: ${rowCount.rows[0].count}`);

    // Test query
    try {
      const testQuery = await pool.query('SELECT * FROM classes LIMIT 1');
      console.log('✅ Table is accessible and queryable');
    } catch (error) {
      console.log(`❌ Table query failed: ${error.message}`);
      console.log('🔄 Recreating table...\n');
      await recreateTable();
      return;
    }

    console.log('\n✅ Classes table structure is correct!');

  } catch (error) {
    console.error('❌ Error verifying table:', error);
    throw error;
  }
};

const recreateTable = async () => {
  try {
    // Drop existing table
    await pool.query('DROP TABLE IF EXISTS classes CASCADE');
    console.log('   ✅ Dropped existing table');

    // Create new table
    await pool.query(`
      CREATE TABLE classes (
        class_code VARCHAR(20) PRIMARY KEY,
        class_name VARCHAR(255) NOT NULL,
        department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT')) NOT NULL,
        lecturer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Created new classes table');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_lecturer_id ON classes(lecturer_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_department ON classes(department)');
    console.log('   ✅ Created indexes');

    // Verify creation
    const verify = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 New table structure:');
    verify.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('❌ Error recreating table:', error);
    throw error;
  }
};

if (require.main === module) {
  verifyAndFixClassesTable()
    .then(() => {
      console.log('\n✅ Verification completed!');
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { verifyAndFixClassesTable };



