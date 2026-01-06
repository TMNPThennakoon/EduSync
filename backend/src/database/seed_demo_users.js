const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const seedDemoUsers = async () => {
  try {
    console.log('🌱 Seeding demo users...\n');

    // Check if demo users already exist
    const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@classroom.com']);
    const existingLecturer = await pool.query('SELECT id FROM users WHERE email = $1', ['lecturer@classroom.com']);
    const existingStudent = await pool.query('SELECT id FROM users WHERE email = $1', ['student1@classroom.com']);

    if (existingAdmin.rows.length > 0 || existingLecturer.rows.length > 0 || existingStudent.rows.length > 0) {
      console.log('⚠️  Demo users already exist. Deleting old ones...\n');
      await pool.query('DELETE FROM users WHERE email IN ($1, $2, $3)', [
        'admin@classroom.com',
        'lecturer@classroom.com',
        'student1@classroom.com'
      ]);
    }

    // Hash passwords
    const passwordHash = await bcrypt.hash('admin123', 10);
    const lecturerPasswordHash = await bcrypt.hash('lecturer123', 10);
    const studentPasswordHash = await bcrypt.hash('student123', 10);

    // Default profile image URL (placeholder - users should update via webcam)
    const defaultProfileImage = 'https://via.placeholder.com/200x200?text=Profile+Image';

    // 1. Create Admin User
    console.log('1. Creating Admin user...');
    const adminResult = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role, 
        department, profile_image_url, is_approved, phone, address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, first_name, last_name, role`,
      [
        'admin@classroom.com',
        passwordHash,
        'Admin',
        'User',
        'admin',
        'ICT',
        defaultProfileImage,
        true, // is_approved
        '0771234567',
        'Faculty of Technology, University of Colombo'
      ]
    );
    console.log(`   ✅ Admin created: ${adminResult.rows[0].email} (ID: ${adminResult.rows[0].id})`);

    // 2. Create Lecturer User
    console.log('2. Creating Lecturer user...');
    const lecturerResult = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role, 
        department, profile_image_url, is_approved, lecturer_id, type, phone, address, nic
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, email, first_name, last_name, role, lecturer_id`,
      [
        'lecturer@classroom.com',
        lecturerPasswordHash,
        'John',
        'Smith',
        'lecturer',
        'IAT',
        defaultProfileImage,
        true, // is_approved
        'LEC001', // lecturer_id
        'permanent', // type
        '0772345678',
        'Faculty of Technology, University of Colombo',
        '123456789V'
      ]
    );
    console.log(`   ✅ Lecturer created: ${lecturerResult.rows[0].email} (ID: ${lecturerResult.rows[0].id}, Lecturer ID: ${lecturerResult.rows[0].lecturer_id})`);

    // 3. Create Student User
    console.log('3. Creating Student user...');
    const studentResult = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role, 
        department, profile_image_url, is_approved, index_no, academic_year, semester, dob, phone, address, nic
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, email, first_name, last_name, role, index_no`,
      [
        'student1@classroom.com',
        studentPasswordHash,
        'Alice',
        'Johnson',
        'student',
        'ICT',
        defaultProfileImage,
        true, // is_approved
        '2023ICT001', // index_no
        2, // academic_year
        3, // semester
        '2000-01-15', // dob
        '0773456789',
        'Faculty of Technology, University of Colombo',
        '200001500123'
      ]
    );
    console.log(`   ✅ Student created: ${studentResult.rows[0].email} (ID: ${studentResult.rows[0].id}, Index: ${studentResult.rows[0].index_no})`);

    console.log('\n✅ Demo users seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Admin:    admin@classroom.com / admin123');
    console.log('   Lecturer: lecturer@classroom.com / lecturer123');
    console.log('   Student:  student1@classroom.com / student123');
    console.log('\n⚠️  Note: All users have placeholder profile images.');
    console.log('   Users should update their profile images via webcam after login.');

  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    throw error;
  }
};

if (require.main === module) {
  seedDemoUsers()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed demo users:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { seedDemoUsers };



