const pool = require('../config/database');

const runMigration = async () => {
    try {
        console.log('🚀 Starting Auto-Enrollment Migration...');

        // Get all classes that have department, year, and semester info
        const classesResult = await pool.query(`
      SELECT class_code, department, academic_year, semester 
      FROM classes 
      WHERE department IS NOT NULL 
      AND academic_year IS NOT NULL 
      AND semester IS NOT NULL
    `);

        console.log(`📋 Found ${classesResult.rows.length} classes to check.`);

        let totalEnrolled = 0;

        for (const cls of classesResult.rows) {
            const { class_code, department, academic_year, semester } = cls;

            // Handle academic_year generic matching (int vs string)
            // Assuming class.academic_year is already integer from our previous analysis, 
            // but let's safely cast or use as is.
            const yearStr = academic_year.toString();

            console.log(`Scanning for ${class_code} (${department} Year ${yearStr} Sem ${semester})...`);

            const query = `
        INSERT INTO enrollments (class_code, student_index)
        SELECT $1::text, index_no 
        FROM users 
        WHERE role = 'student' 
        AND department = $2 
        AND semester::text = $3::text
        AND (
            academic_year::text = $4::text 
            OR academic_year::text ILIKE $5
        )
        AND index_no IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM enrollments e 
            WHERE e.class_code = $1::text 
            AND e.student_index = users.index_no
        )
      `;

            // Use ILIKE with wildcard for robust year matching (e.g. "3" matches "3rd Year")
            const result = await pool.query(query, [
                class_code,
                department,
                semester,
                yearStr,
                `${yearStr}%`
            ]);

            if (result.rowCount > 0) {
                console.log(`✅  Enrolled ${result.rowCount} students into ${class_code}`);
                totalEnrolled += result.rowCount;
            } else {
                // console.log(`   No new students for ${class_code}`);
            }
        }

        console.log('------------------------------------------------');
        console.log(`🎉 Migration Complete. Total new enrollments: ${totalEnrolled}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

runMigration();
