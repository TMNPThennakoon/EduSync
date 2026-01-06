const pool = require('../config/database');

const insertTestClass = async () => {
  try {
    console.log('📝 Inserting test class data...\n');

    // Check if we have a lecturer user
    const lecturerResult = await pool.query(`
      SELECT id FROM users 
      WHERE role = 'lecturer' 
      LIMIT 1
    `);

    let lecturerId = null;
    if (lecturerResult.rows.length > 0) {
      lecturerId = lecturerResult.rows[0].id;
      console.log(`✅ Found lecturer with ID: ${lecturerId}`);
    } else {
      console.log('⚠️  No lecturer found, creating class without lecturer_id');
    }

    // Insert test class
    const result = await pool.query(`
      INSERT INTO classes (class_code, class_name, department, lecturer_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, ['IA3205', 'Digital Electronics 2', 'IAT', lecturerId]);

    console.log('✅ Test class inserted successfully!');
    console.log('\n📋 Inserted class:');
    console.log(`   - Class Code: ${result.rows[0].class_code}`);
    console.log(`   - Class Name: ${result.rows[0].class_name}`);
    console.log(`   - Department: ${result.rows[0].department}`);
    console.log(`   - Lecturer ID: ${result.rows[0].lecturer_id || 'NULL'}`);

    // Verify the data
    const verify = await pool.query('SELECT * FROM classes');
    console.log(`\n📊 Total classes in table: ${verify.rows.length}`);
    
    if (verify.rows.length > 0) {
      console.log('\n📋 All classes:');
      verify.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.class_code} - ${row.class_name} (${row.department})`);
      });
    }

  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.log('ℹ️  Test class already exists');
    } else {
      console.error('❌ Error inserting test class:', error.message);
      throw error;
    }
  }
};

if (require.main === module) {
  insertTestClass()
    .then(() => {
      console.log('\n✅ Test data insertion completed!');
      console.log('\n💡 If your database tool still doesn\'t show the table:');
      console.log('   1. Refresh the database connection');
      console.log('   2. Right-click on "Tables" and select "Refresh"');
      console.log('   3. Right-click on "classes" table and select "Refresh"');
      console.log('   4. Try disconnecting and reconnecting to the database');
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test data insertion failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { insertTestClass };



