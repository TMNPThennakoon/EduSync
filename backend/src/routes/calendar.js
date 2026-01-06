const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

router.use(authenticateToken);

router.get('/events', calendarController.getEvents);

module.exports = router;
