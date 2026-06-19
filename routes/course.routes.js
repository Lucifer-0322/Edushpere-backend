const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Teacher only — must come BEFORE '/:id' route
router.get('/my-courses', verifyToken, authorizeRoles('TEACHER'), courseController.getMyCourses);

// Student/Teacher accessible
router.get('/', verifyToken, courseController.getAllCourses);
router.get('/:id', verifyToken, courseController.getCourseById);

// Teacher only accessible
router.post('/', verifyToken, authorizeRoles('TEACHER'), courseController.createCourse);

router.delete('/:id', verifyToken, authorizeRoles('TEACHER'), courseController.deleteCourse);

module.exports = router;