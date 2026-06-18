/**
 * EduSphere AI - AI Learning Insight Controller
 * Lets students fetch their own AI-generated weak topic insights.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get all AI insights for the logged-in student
 * @route   GET /api/insights
 * @access  Private (STUDENT)
 */
exports.getMyInsights = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const insights = await prisma.aILearningInsight.findMany({
            where: { studentId },
            orderBy: { id: 'desc' },
            take: 5
        });

        res.status(200).json(insights);
    } catch (error) {
        console.error("Fetch Insights Error:", error);
        res.status(500).json({ error: "Failed to fetch AI insights." });
    }
};

/**
 * @desc    Get quiz attempt stats for the logged-in student
 *          (total attempts + average percentage)
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