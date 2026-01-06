const pool = require('../config/database');

const createAnnouncement = async (req, res) => {
    const { class_code, title, content } = req.body;
    const created_by = req.user.id;

    // Support bulk creation if class_code is an array
    const classCodes = Array.isArray(class_code) ? class_code : [class_code];

    if (classCodes.length === 0) {
        return res.status(400).json({ success: false, error: 'No classes selected' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const announcements = [];

        for (const code of classCodes) {
            const result = await client.query(
                `INSERT INTO announcements (class_code, title, content, created_by)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [code, title, content, created_by]
            );
            announcements.push(result.rows[0]);
        }

        await client.query('COMMIT');

        // Get io instance and emit events
        const io = req.app.get('io');
        if (io) {
            announcements.forEach(ann => {
                io.emit('new_announcement', ann);
            });
        }

        res.status(201).json({
            success: true,
            message: `Announcement created for ${announcements.length} classes`,
            announcements: announcements
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating announcement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create announcement'
        });
    } finally {
        client.release();
    }
};

const getClassAnnouncements = async (req, res) => {
    const { class_code } = req.params;

    try {
        const result = await pool.query(
            `SELECT a.*, u.first_name, u.last_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.class_code = $1
       ORDER BY a.created_at DESC`,
            [class_code]
        );

        res.status(200).json({
            success: true,
            announcements: result.rows
        });
    } catch (error) {
        console.error('Error fetching class announcements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch announcements'
        });
    }
};

const getStudentAnnouncements = async (req, res) => {
    const student_id = req.user.id;

    try {
        // First get the student's index number
        const userRes = await pool.query('SELECT index_no FROM users WHERE id = $1', [student_id]);
        if (userRes.rows.length === 0 || !userRes.rows[0].index_no) {
            return res.status(200).json({ success: true, announcements: [] });
        }
        const studentIndex = userRes.rows[0].index_no;

        const result = await pool.query(
            `SELECT a.*, c.class_name, u.first_name, u.last_name
       FROM announcements a
       JOIN classes c ON a.class_code = c.class_code
       JOIN enrollments e ON c.class_code = e.class_code
       LEFT JOIN users u ON a.created_by = u.id
       WHERE e.student_index = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
            [studentIndex]
        );

        res.status(200).json({
            success: true,
            announcements: result.rows
        });
    } catch (error) {
        console.error('Error fetching student announcements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch announcements'
        });
    }
};

const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `DELETE FROM announcements 
             WHERE id = $1 AND created_by = $2
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Announcement not found or you do not have permission to delete it'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete announcement'
        });
    }
};

module.exports = {
    createAnnouncement,
    getClassAnnouncements,
    getStudentAnnouncements,
    deleteAnnouncement
};
