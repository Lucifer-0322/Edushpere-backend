const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all materials for a course
router.get('/:courseId', verifyToken, materialController.getMaterialsByCourse);

// Create new material (Teacher only)
router.post('/', verifyToken, authorizeRoles('TEACHER'), materialController.createMaterial);

module.exports = router;