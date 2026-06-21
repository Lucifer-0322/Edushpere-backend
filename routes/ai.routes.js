const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/my-insight', verifyToken, aiController.getMyLatestInsight);

// Feature 3 — Course Description Generator (TEACHER)
router.post('/generate-description', verifyToken, authorizeRoles('TEACHER'), aiController.generateDescription);

// Feature 2 — Student Performance Report (STUDENT)
router.get('/my-report', verifyToken, authorizeRoles('STUDENT'), aiController.getPerformanceReport);

// Feature 1 — AI Quiz Generator (TEACHER)
router.post('/generate-quiz', verifyToken, authorizeRoles('TEACHER'), aiController.generateQuiz);

module.exports = router;
