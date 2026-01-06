const pool = require('../config/database');
const { logError } = require('../utils/logger');

const getEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let events = [];

        // Common queries parts
        let lectureQuery = '';
        let assignmentQuery = '';
        let examQuery = '';
        let params = [userId];

        if (role === 'student') {
            // 1. Get student's index number first
            const studentResult = await pool.query('SELECT index_no FROM users WHERE id = $1', [userId]);
            if (studentResult.rows.length === 0 || !studentResult.rows[0].index_no) {
                return res.json([]); // No index number = no enrollments
            }
            const studentIndex = studentResult.rows[0].index_no;

            // Student: Get events for enrolled classes using index_no and class_code
            lectureQuery = `
                SELECT s.id as session_id, c.class_name, s.start_time::date as date, s.start_time, s.end_time, 'Lecture' as type
                FROM attendance_sessions s
                JOIN classes c ON s.class_code = c.class_code
                JOIN enrollments e ON c.class_code = e.class_code
                WHERE e.student_index = $1
            `;
            assignmentQuery = `
                SELECT a.id, a.title, c.class_name, a.due_date as date, '23:59:00' as start_time, NULL as end_time, 'Assignment' as type
                FROM assignments a
                JOIN classes c ON a.class_code = c.class_code
                JOIN enrollments e ON c.class_code = e.class_code
                WHERE e.student_index = $1
            `;
            // Removed exams query for now as table existence is unverified and causing errors
            params = [studentIndex];

        } else if (role === 'lecturer') {
            // Lecturer: Get events for classes they created/teach using lecturer_id
            lectureQuery = `
                SELECT s.id as session_id, c.class_name, s.start_time::date as date, s.start_time, s.end_time, 'Lecture' as type
                FROM attendance_sessions s
                JOIN classes c ON s.class_code = c.class_code
                WHERE c.lecturer_id = $1
            `;
            assignmentQuery = `
                SELECT a.id, a.title, c.class_name, a.due_date as date, '23:59:00' as start_time, NULL as end_time, 'Assignment' as type
                FROM assignments a
                JOIN classes c ON a.class_code = c.class_code
                WHERE c.lecturer_id = $1
            `;
            params = [userId];

        } else if (role === 'admin') {
            lectureQuery = `
                SELECT s.id as session_id, c.class_name, s.start_time::date as date, s.start_time, s.end_time, 'Lecture' as type
                FROM attendance_sessions s
                JOIN classes c ON s.class_code = c.class_code
            `;
            assignmentQuery = `
                SELECT a.id, a.title, c.class_name, a.due_date as date, '23:59:00' as start_time, NULL as end_time, 'Assignment' as type
                FROM assignments a
                JOIN classes c ON a.class_code = c.class_code
            `;
            params = [];
        }

        const [lectures, assignments] = await Promise.all([
            pool.query(lectureQuery, params),
            pool.query(assignmentQuery, params)
        ]);

        // Helper to formatting
        const formatEvents = (rows, defaultColor) => {
            return rows.map(row => {
                // Combine date and time
                const d = new Date(row.date);
                const dateStr = d.toISOString().split('T')[0];

                return {
                    id: `${row.type}-${row.session_id || row.id}`,
                    title: `${row.type}: ${row.class_name || ''} - ${row.title || ''}`,
                    start: `${dateStr}T${row.start_time}`,
                    end: row.end_time ? `${dateStr}T${row.end_time}` : undefined,
                    backgroundColor: defaultColor,
                    borderColor: defaultColor,
                    extendedProps: { ...row }
                };
            });
        };

        events = [
            ...formatEvents(lectures.rows, '#3b82f6'), // Blue for Lectures
            ...formatEvents(assignments.rows, '#ef4444') // Red for Assignments
        ];

        res.json(events);

    } catch (error) {
        logError(error, { action: 'get_calendar_events', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getEvents
};
