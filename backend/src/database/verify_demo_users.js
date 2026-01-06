const pool = require('../config/database');

const verifyDemoUsers = async () => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_approved, index_no, lecturer_id FROM users ORDER BY id'
    );

    console.log('📋 Users in database:\n');
    result.rows.forEach(user => {
      console.log(`  ${user.id}. ${user.email}`);
      console.log(`     Name: ${user.first_name} ${user.last_name}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Approved: ${user.is_approved}`);
      if (user.index_no) {
        console.log(`     Index: ${user.index_no}`);
      }
      if (user.lecturer_id) {
        console.log(`     Lecturer ID: ${user.lecturer_id}`);
      }
      console.log('');
    });

    console.log(`✅ Total users: ${result.rows.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

if (require.main === module) {
  verifyDemoUsers()
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

module.exports = { verifyDemoUsers };



