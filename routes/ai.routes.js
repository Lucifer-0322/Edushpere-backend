const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insight.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/my-insight', verifyToken, insightController.getMyLatestInsight);

module.exports = router;