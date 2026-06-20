/**
 * EduSphere AI - Analytics Controller
 * Aggregates quiz performance data scoped to the logged-in teacher's own courses.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get aggregated quiz analytics for the logged-in teacher's OWN courses
 *          (score trend across quizzes + weak-topic density breakdown)
 * @route   GET /api/analytics/teacher
 * @access  Private (TEACHER only)
 */
exports.getTeacherAnalytics = async (req, res) => {
    try {
        const teacherId = req.user.userId;

        // Every quiz that belongs to a course THIS teacher owns,
        // with all student attempts on each quiz.
        const quizzes = await prisma.quiz.findMany({
            where: { course: { teacherId } },
            orderBy: { createdAt: 'asc' },
            include: {
                attempts: { select: { percentage: true } }
            }
        });

        const totalCourses = await prisma.course.count({ where: { teacherId } });
        const totalQuizzes = quizzes.length;
        const totalAttempts = quizzes.reduce((sum, q) => sum + q.attempts.length, 0);

        // --- Score trend: average % per quiz, in chronological order ---
        // Quizzes with zero attempts are skipped — nothing to average yet.
        const scoreTrend = { labels: [], data: [] };

        quizzes.forEach((quiz) => {
            if (quiz.attempts.length === 0) return;
            const avg = quiz.attempts.reduce((sum, a) => sum + a.percentage, 0) / quiz.attempts.length;
            scoreTrend.labels.push(quiz.title);
            scoreTrend.data.push(Math.round(avg));
        });

        // --- Weak-topic density: avg deficit (100 - avg%) grouped by quiz topic ---
        const topicMap = {}; // topic -> { totalPercentage, attemptCount }

        quizzes.forEach((quiz) => {
            if (quiz.attempts.length === 0) return;
            if (!topicMap[quiz.topic]) {
                topicMap[quiz.topic] = { totalPercentage: 0, attemptCount: 0 };
            }
            quiz.attempts.forEach((a) => {
                topicMap[quiz.topic].totalPercentage += a.percentage;
                topicMap[quiz.topic].attemptCount += 1;
            });
        });

        const weakTopics = Object.entries(topicMap)
            .map(([topic, stats]) => ({
                topic,
                deficit: Math.round(100 - (stats.totalPercentage / stats.attemptCount)),
                attempts: stats.attemptCount
            }))
            .sort((a, b) => b.deficit - a.deficit)
            .slice(0, 5); // top 5 weakest topics

        res.status(200).json({
            totalCourses,
            totalQuizzes,
            totalAttempts,
            scoreTrend,
            weakTopics
        });

    } catch (error) {
        console.error("Teacher Analytics Error:", error);
        res.status(500).json({ error: "Failed to compute classroom analytics." });
    }
};