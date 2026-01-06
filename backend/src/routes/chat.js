const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.use(authenticateToken);

router.get('/contacts', chatController.getContacts);
router.get('/history/:otherUserId', chatController.getChatHistory);
router.post('/read', chatController.markAsRead);

module.exports = router;
