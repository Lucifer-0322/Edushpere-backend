const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Teacher only — analytics scoped to their own courses
router.get('/teacher', verifyToken, authorizeRoles('TEACHER'), analyticsController.getTeacherAnalytics);

module.exports = router;
