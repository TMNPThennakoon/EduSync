const pool = require('../config/database');

const enrollStudent = async () => {
  try {
    const studentEmail = 'thenapi1009@gmail.com';
    const classCode = 'IA3209'; // Change this to the class code you want to enroll in

    console.log(`📝 Enrolling student ${studentEmail} in class ${classCode}...\n`);

    // Get student
    const studentResult = await pool.query(`
      SELECT id, email, index_no, first_name, last_name
      FROM users 
      WHERE email = $1
    `, [studentEmail]);

    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const student = studentResult.rows[0];
    console.log(`✅ Student found: ${student.first_name} ${student.last_name}`);
    console.log(`   Index: ${student.index_no || 'NULL'}\n`);

    if (!student.index_no) {
      console.log('❌ Student has no index_no. Cannot enroll.');
      return;
    }

    // Check if class exists
    const classResult = await pool.query(`
      SELECT class_code, class_name
      FROM classes 
      WHERE class_code = $1
    `, [classCode]);

    if (classResult.rows.length === 0) {
      console.log(`❌ Class ${classCode} not found`);
      return;
    }

    const classInfo = classResult.rows[0];
    console.log(`✅ Class found: ${classInfo.class_name}\n`);

    // Check if already enrolled
    const existingEnrollment = await pool.query(`
      SELECT id FROM enrollments 
      WHERE student_index = $1 AND class_code = $2
    `, [student.index_no, classCode]);

    if (existingEnrollment.rows.length > 0) {
      console.log('ℹ️  Student is already enrolled in this class');
      return;
    }

    // Enroll student
    const enrollmentResult = await pool.query(`
      INSERT INTO enrollments (student_index, class_code)
      VALUES ($1, $2)
      RETURNING *
    `, [student.index_no, classCode]);

    console.log('✅ Student enrolled successfully!');
    console.log(`   Enrollment ID: ${enrollmentResult.rows[0].id}`);
    console.log(`   Enrolled Date: ${enrollmentResult.rows[0].enrolled_date}\n`);

    // Verify enrollment count
    const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM enrollments
      WHERE class_code = $1
    `, [classCode]);

    console.log(`📊 Total students enrolled in ${classCode}: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '23505') {
      console.error('   Duplicate enrollment detected');
    }
  }
};

if (require.main === module) {
  enrollStudent()
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

module.exports = { enrollStudent };



