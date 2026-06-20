const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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