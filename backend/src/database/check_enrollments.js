const pool = require('../config/database');

const checkEnrollments = async () => {
  try {
    console.log('🔍 Checking enrollments...\n');

    // Check student
    const studentResult = await pool.query(`
      SELECT id, email, index_no, first_name, last_name, academic_year, semester, department
      FROM users 
      WHERE email = $1
    `, ['thenapi1009@gmail.com']);

    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const student = studentResult.rows[0];
    console.log('✅ Student found:');
    console.log(`   ID: ${student.id}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Index: ${student.index_no || 'NULL'}`);
    console.log(`   Name: ${student.first_name} ${student.last_name}`);
    console.log(`   Year: ${student.academic_year}, Semester: ${student.semester}`);
    console.log(`   Department: ${student.department}\n`);

    // Check enrollments
    if (student.index_no) {
      const enrollmentsResult = await pool.query(`
        SELECT e.*, c.class_name, c.class_code
        FROM enrollments e
        JOIN classes c ON e.class_code = c.class_code
        WHERE e.student_index = $1
      `, [student.index_no]);

      console.log(`📋 Enrollments for ${student.index_no}:`);
      if (enrollmentsResult.rows.length === 0) {
        console.log('   ❌ No enrollments found');
      } else {
        enrollmentsResult.rows.forEach((enrollment, index) => {
          console.log(`   ${index + 1}. ${enrollment.class_code} - ${enrollment.class_name}`);
          console.log(`      Enrolled: ${enrollment.enrolled_date}`);
        });
      }
    } else {
      console.log('⚠️  Student has no index_no, cannot check enrollments');
    }

    // Check all enrollments by class
    console.log('\n📊 Enrollment counts by class:');
    const countsResult = await pool.query(`
      SELECT c.class_code, c.class_name, COUNT(e.id) as enrollment_count
      FROM classes c
      LEFT JOIN enrollments e ON c.class_code = e.class_code
      GROUP BY c.class_code, c.class_name
      ORDER BY c.class_code
    `);

    countsResult.rows.forEach(row => {
      console.log(`   ${row.class_code} (${row.class_name}): ${row.enrollment_count} students`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

if (require.main === module) {
  checkEnrollments()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { checkEnrollments };



