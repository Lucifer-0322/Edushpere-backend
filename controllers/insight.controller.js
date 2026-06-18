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