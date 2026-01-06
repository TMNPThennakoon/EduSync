const pool = require('../src/config/database');
require('dotenv').config();

const syncEnrollments = async () => {
    try {
        console.log('🔄 Starting enrollment sync...');

        // Get all students
        const studentsResult = await pool.query(`
      SELECT id, index_no, department, academic_year, semester, first_name 
      FROM users 
      WHERE role = 'student' 
      AND index_no IS NOT NULL 
    `);

        // Get all classes
        const classesResult = await pool.query(`SELECT class_code, department, academic_year, semester FROM classes`);

        const students = studentsResult.rows;
        const classes = classesResult.rows;

        console.log(`📋 Found ${students.length} students.`);
        console.log(`📋 Found ${classes.length} classes.`);

        students.forEach(s => {
            console.log(`   👤 Student: ${s.first_name} (${s.index_no}) | Dept: "${s.department}" | Year: "${s.academic_year}" | Sem: "${s.semester}"`);
        });

        classes.forEach(c => {
            console.log(`   📚 Class: ${c.class_code} | Dept: "${c.department}" | Year: "${c.academic_year}" | Sem: "${c.semester}"`);
        });

        let totalEnrolled = 0;

        for (const student of students) {
            const { index_no, department, academic_year, semester } = student;

            // Normalize student attributes
            let yearNum = null;
            if (typeof academic_year === 'string' && academic_year.includes('Year')) {
                yearNum = parseInt(academic_year.charAt(0));
            } else if (academic_year) {
                yearNum = parseInt(academic_year);
            }

            const semNum = parseInt(semester);

            if (!yearNum || !semNum || !department) {
                console.log(`⚠️ Skipping ${index_no}: Missing/Invalid Dept/Year/Sem`);
                continue;
            }

            // Filter matching classes
            const matchingClasses = classes.filter(cls => {
                const clsYear = parseInt(cls.academic_year);
                const clsSem = parseInt(cls.semester);
                return cls.department === department &&
                    clsYear === yearNum &&
                    clsSem === semNum;
            });

            if (matchingClasses.length > 0) {
                console.log(`   ✨ ${index_no} matches ${matchingClasses.length} classes: ${matchingClasses.map(c => c.class_code).join(', ')}`);
            } else {
                console.log(`   ❌ ${index_no} matches 0 classes. (Looking for Dept:${department}, Year:${yearNum}, Sem:${semNum})`);
            }

            for (const cls of matchingClasses) {
                // Check if already enrolled
                const check = await pool.query(
                    'SELECT 1 FROM enrollments WHERE class_code = $1 AND student_index = $2',
                    [cls.class_code, index_no]
                );

                if (check.rowCount === 0) {
                    await pool.query(
                        'INSERT INTO enrollments (class_code, student_index) VALUES ($1, $2)',
                        [cls.class_code, index_no]
                    );
                    totalEnrolled++;
                    console.log(`      ✅ Enrolled in ${cls.class_code}`);
                } else {
                    console.log(`      ℹ️ Already enrolled in ${cls.class_code}`);
                }
            }
        }

        console.log(`🎉 Sync complete. Successfully enrolled ${totalEnrolled} students.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error syncing enrollments:', error);
        process.exit(1);
    }
};

syncEnrollments();
