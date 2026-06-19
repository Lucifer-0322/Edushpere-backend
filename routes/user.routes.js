const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Only ADMIN can access these routes
router.get('/', verifyToken, authorizeRoles('ADMIN'), userController.getAllUsers);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN'), userController.deleteUser);

module.exports = router;