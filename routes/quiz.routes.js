const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Protected assessment access links
router.get('/:id', verifyToken, quizController.getQuizById);
router.post('/:id/submit', verifyToken, quizController.submitQuiz);

// Instructor configuration access control lines
router.post('/', verifyToken, authorizeRoles('TEACHER'), quizController.createQuiz);

module.exports = router;