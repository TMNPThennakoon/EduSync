const pool = require('../config/database');
const { logError } = require('../utils/logger');

const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.params;

        // Fetch messages between the two users
        const result = await pool.query(`
            SELECT * FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC
        `, [userId, otherUserId]);

        res.json(result.rows);
    } catch (error) {
        logError(error, { action: 'get_chat_history', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getContacts = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        let query = '';

        // Determine contacts based on role
        if (userRole === 'student') {
            // Students see their lecturers (from enrolled classes)
            // Simplify: All lecturers for now, or join with enrollments
            query = `
                SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.profile_image_url
                FROM users u
                WHERE u.role = 'lecturer'
            `;
        } else if (userRole === 'lecturer') {
            // Lecturers see Admins + Students
            query = `
                SELECT id, first_name, last_name, role, profile_image_url
                FROM users 
                WHERE role IN ('student', 'admin')
             `;
        } else if (userRole === 'admin') {
            // Admins see everyone (mostly lecturers/admins)
            query = `
                SELECT id, first_name, last_name, role, profile_image_url
                FROM users 
                WHERE id != $1
            `;
        }

        const result = await pool.query(query, userRole === 'admin' ? [userId] : []);
        res.json(result.rows);
    } catch (error) {
        logError(error, { action: 'get_chat_contacts', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { senderId } = req.body;

        await pool.query(`
            UPDATE messages 
            SET is_read = TRUE 
            WHERE sender_id = $1 AND receiver_id = $2
        `, [senderId, userId]);

        res.json({ success: true });
    } catch (error) {
        logError(error, { action: 'mark_messages_read', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getChatHistory,
    getContacts,
    markAsRead
};
