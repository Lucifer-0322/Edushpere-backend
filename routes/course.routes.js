const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Student/Teacher accessible
router.get('/', verifyToken, courseController.getAllCourses);
router.get('/:id', verifyToken, courseController.getCourseById);

// Teacher only accessible
router.post('/', verifyToken, authorizeRoles('TEACHER'), courseController.createCourse);

module.exports = router;