const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');

const authRoutes      = require('./routes/authRoutes');
const courseRoutes    = require('./routes/course.routes');
const quizRoutes      = require('./routes/quiz.routes');
const insightRoutes   = require('./routes/insight.routes');
const userRoutes      = require('./routes/user.routes');
const materialRoutes  = require('./routes/material.routes');
const analyticsRoutes = require('./routes/analytics.routes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: "ONLINE", 
        message: "EduSphere AI core engine operational." 
    });
});

app.use('/api/auth',      authRoutes);
app.use('/api/courses',   courseRoutes);
app.use('/api/quizzes',   quizRoutes);
app.use('/api/insights',  insightRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err, req, res, next) => {
    console.error("Global Error:", err.stack);
    res.status(500).json({ error: "Something went wrong on the server." });
});

module.exports = app;