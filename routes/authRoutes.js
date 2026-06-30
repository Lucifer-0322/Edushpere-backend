const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { register, login, forgotPassword } = require('../controllers/authController');

router.post('/forgot-password', forgotPassword);
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;