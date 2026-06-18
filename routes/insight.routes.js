const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insight.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/stats', verifyToken, insightController.getMyQuizStats);
router.get('/', verifyToken, insightController.getMyInsights);

module.exports = router;