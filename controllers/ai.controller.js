/**
 * EduSphere AI - AI Features Controller
 * Houses the Gemini-powered features that aren't tied to a specific
 * resource controller: latest-insight lookup, course description
 * generation, performance reports, and quiz generation.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
    generateCourseDescription,
    generatePerformanceReport,
    generateQuizQuestions
} = require('../services/gemini.service');

/**
 * @desc    Get the single most recent AI insight for the logged-in student
 * @route   GET /api/ai/my-insight
 * @access  Private (STUDENT)
 */
exports.getMyLatestInsight = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const insight = await prisma.aILearningInsight.findFirst({
            where: { studentId },
            orderBy: { generatedAt: 'desc' }
        });

        res.status(200).json({ insight: insight || null });
    } catch (error) {
        console.error("Fetch AI Insight Error:", error);
        res.status(500).json({ error: "Failed to retrieve AI recommendation." });
    }
};

/**
 * @desc    Generate a course description from just a title (Gemini)
 * @route   POST /api/ai/generate-description
 * @access  Private (TEACHER only)
 */
exports.generateDescription = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Course title is required." });
        }

        const description = await generateCourseDescription(title.trim());

        res.status(200).json({ description });
    } catch (error) {
        console.error("Description Generation Error:", error.message);
        res.status(500).json({ error: `Failed to generate description: ${error.message}` });
    }
};

/**
 * @desc    Generate an AI report card from the student's quiz attempt history
 * @route   GET /api/ai/my-report
 * @access  Private (STUDENT only)
 */
exports.getPerformanceReport = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const attempts = await prisma.quizAttempt.findMany({
            where: { studentId },
            include: {
                quiz: { select: { title: true, topic: true } }
            },
            orderBy: { submittedAt: 'asc' }
        });

        if (attempts.length === 0) {
            return res.status(200).json({
                report: null,
                message: "Complete at least one quiz to generate your AI report."
            });
        }

        const performanceSummary = attempts
            .map(a => `- ${a.quiz.topic}: ${Math.round(a.percentage)}% (${a.score}/${a.totalMarks} correct)`)
            .join("\n");

        const totalAvg = Math.round(
            attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
        );

        const report = await generatePerformanceReport(performanceSummary, totalAvg);

        res.status(200).json({
            report,
            totalAttempts: attempts.length,
            overallAverage: totalAvg
        });

    } catch (error) {
        console.error("Performance Report Error:", error.message);
        res.status(500).json({ error: `Failed to generate performance report: ${error.message}` });
    }
};

/**
 * @desc    Generate multiple-choice quiz questions from a topic (Gemini)
 * @route   POST /api/ai/generate-quiz
 * @access  Private (TEACHER only)
 */
exports.generateQuiz = async (req, res) => {
    try {
        const { topic, count = 5 } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({ error: "Topic is required." });
        }

        const safeCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);

        const questions = await generateQuizQuestions(topic.trim(), safeCount);

        res.status(200).json({ questions, topic: topic.trim() });

    } catch (error) {
        console.error("Quiz Generation Error:", error.message);
        res.status(500).json({ error: `Failed to generate quiz questions: ${error.message}` });
    }
};