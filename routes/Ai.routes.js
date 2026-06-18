const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/my-insight', verifyToken, authorizeRoles('STUDENT'), aiController.getMyLatestInsight);

module.exports = router;