const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, courseController.getAllCourses);
router.get('/my-courses', verifyToken, authorizeRoles('TEACHER'), courseController.getMyCourses);
router.get('/:id/leaderboard', verifyToken, courseController.getCourseLeaderboard);
router.get('/:id', verifyToken, courseController.getCourseById);
router.post('/', verifyToken, authorizeRoles('TEACHER'), courseController.createCourse);
router.delete('/:id', verifyToken, authorizeRoles('TEACHER', 'ADMIN'), courseController.deleteCourse);

module.exports = router;