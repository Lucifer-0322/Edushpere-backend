/**
 * EduSphere AI - Application Configuration & Route Manager
 */

const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');

// Route imports
const authRoutes   = require('./routes/authRoutes');
const courseRoutes = require('./routes/course.routes');
const quizRoutes   = require('./routes/quiz.routes');

dotenv.config();
const app = express();

// ── Global Middleware ──
app.use(cors());
app.use(express.json());

// ── Health Check ──
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: "ONLINE", 
        message: "EduSphere AI core engine operational." 
    });
});

// ── Mount Routes ──
app.use('/api/auth',    authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);

// ── Global Error Handler ──
app.use((err, req, res, next) => {
    console.error("Global Error:", err.stack);
    res.status(500).json({ error: "Something went wrong on the server." });
});

module.exports = app;