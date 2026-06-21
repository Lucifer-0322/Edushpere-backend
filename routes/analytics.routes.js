const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All teacher courses combined
router.get('/teacher', verifyToken, authorizeRoles('TEACHER'), analyticsController.getTeacherAnalytics);

// Single course analytics
router.get('/course/:courseId', verifyToken, authorizeRoles('TEACHER'), analyticsController.getCourseAnalytics);

module.exports = router;