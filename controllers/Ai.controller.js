/**
 * EduSphere AI - AI Insights Controller
 * Exposes the student's most recent Gemini-generated recommendation.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get the logged-in student's most recent AI insight
 * @route   GET /api/ai/my-insight
 * @access  Private (STUDENT only)
 */
exports.getMyLatestInsight = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const insight = await prisma.aILearningInsight.findFirst({
            where: { studentId },
            orderBy: { generatedAt: 'desc' }
        });

        if (!insight) {
            return res.status(200).json({ insight: null });
        }

        res.status(200).json({ insight });
    } catch (error) {
        console.error("Fetch AI Insight Error:", error);
        res.status(500).json({ error: "Failed to retrieve AI recommendation." });
    }
};