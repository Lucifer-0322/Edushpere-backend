/**
 * EduSphere AI - AI Learning Insight Controller
 */

const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * @desc    Get latest AI insight for logged-in student
 * @route   GET /api/insights/my-insight
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
 * @desc    Get all AI insights for logged-in student (last 5)
 * @route   GET /api/insights
 * @access  Private (STUDENT)
 */
exports.getMyInsights = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const insights = await prisma.aILearningInsight.findMany({
            where: { studentId },
            orderBy: { generatedAt: 'desc' },
            take: 5
        });

        res.status(200).json(insights);
    } catch (error) {
        console.error("Fetch Insights Error:", error);
        res.status(500).json({ error: "Failed to fetch AI insights." });
    }
};

/**
 * @desc    Get quiz attempt stats for logged-in student
 * @route   GET /api/insights/stats
 * @access  Private (STUDENT)
 */
exports.getMyQuizStats = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const attempts = await prisma.quizAttempt.findMany({
            where: { studentId },
            select: { percentage: true }
        });

        const totalAttempts = attempts.length;
        const averagePercentage = totalAttempts > 0
            ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
            : 0;

        res.status(200).json({
            totalAttempts,
            averagePercentage: Math.round(averagePercentage)
        });
    } catch (error) {
        console.error("Fetch Quiz Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch quiz stats." });
    }
};

/**
 * @desc    Generate AI course description
 * @route   POST /api/insights/generate-description
 * @access  Private (TEACHER)
 */
exports.generateCourseDescription = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ error: "Course title is required." });

        const prompt = `Write a professional 2-3 sentence course description for a university course titled "${title}". Mention what students will learn and what skills they will gain. Be clear, engaging, and academic. Return ONLY the description text, no extra formatting or labels.`;

        const result = await model.generateContent(prompt);
        const description = result.response.text().trim();

        res.status(200).json({ description });
    } catch (error) {
        console.error("Description Generation Error:", error.message);
        res.status(500).json({ error: "Failed to generate description." });
    }
};

/**
 * @desc    Generate AI performance report card
 * @route   GET /api/insights/my-report
 * @access  Private (STUDENT)
 */
exports.getPerformanceReport = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const attempts = await prisma.quizAttempt.findMany({
            where: { studentId },
            include: { quiz: { select: { title: true, topic: true } } },
            orderBy: { submittedAt: 'asc' }
        });

        if (attempts.length === 0) {
            return res.status(200).json({
                report: null,
                message: "Complete at least one quiz to generate your AI report."
            });
        }

        const performanceSummary = attempts.map(a =>
            `- ${a.quiz.topic}: ${Math.round(a.percentage)}% (${a.score}/${a.totalMarks} correct)`
        ).join("\n");

        const totalAvg = Math.round(
            attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
        );

        const prompt = `You are an educational AI assistant. Analyze this student's quiz performance:

${performanceSummary}

Overall average: ${totalAvg}%

Return ONLY a valid JSON object (no markdown, no backticks):
{
  "overallGrade": "A or B or C or D or F",
  "strengths": ["topic1", "topic2"],
  "weakAreas": ["topic1", "topic2"],
  "studyPlan": ["Step 1: action", "Step 2: action", "Step 3: action"],
  "motivationalMessage": "one encouraging sentence"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();
        const parsed = JSON.parse(text);

        res.status(200).json({
            report: parsed,
            totalAttempts: attempts.length,
            overallAverage: totalAvg
        });

    } catch (error) {
        console.error("Performance Report Error:", error.message);
        res.status(500).json({ error: "Failed to generate performance report." });
    }
};

/**
 * @desc    Generate AI quiz questions from topic
 * @route   POST /api/insights/generate-quiz
 * @access  Private (TEACHER)
 */
exports.generateQuizQuestions = async (req, res) => {
    try {
        const { topic, count = 5 } = req.body;
        if (!topic) return res.status(400).json({ error: "Topic is required." });

        const prompt = `Generate exactly ${count} multiple choice questions about "${topic}" for a university course.

Return ONLY a valid JSON array (no markdown, no backticks):
[
  {
    "questionText": "Question here?",
    "optionA": "First option",
    "optionB": "Second option",
    "optionC": "Third option",
    "optionD": "Fourth option",
    "correctOption": "A"
  }
]

Rules:
- correctOption must be exactly A, B, C, or D
- All 4 options must be distinct
- Return exactly ${count} questions`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();
        const questions = JSON.parse(text);

        if (!Array.isArray(questions)) throw new Error("Invalid response from Gemini.");

        res.status(200).json({ questions, topic });
    } catch (error) {
        console.error("Quiz Generation Error:", error.message);
        res.status(500).json({ error: "Failed to generate quiz questions." });
    }
};