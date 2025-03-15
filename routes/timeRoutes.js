const express = require('express');
const router = express.Router();
const { getServerTime, validateExamTime } = require('../controllers/timeController');
const authMiddleware = require("../middlewares/authMiddeware")

// General time synchronization
router.get('/', authMiddleware, getServerTime);

// Exam-specific time validation
router.get('/validate/:examId',authMiddleware, validateExamTime);

module.exports = router; 