/**
 * EduSphere AI - Teacher Analytics Controller
 * Provides aggregated performance data for teacher dashboards.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get combined analytics across ALL of a teacher's courses
 * @route   GET /api/analytics/teacher
 * @access  Private (TEACHER only)
 */
exports.getTeacherAnalytics = async (req, res) => {
    try {
        const teacherId = req.user.userId;

        // Get all courses owned by this teacher, with their quizzes and attempts
        const courses = await prisma.course.findMany({
            where: { teacherId },
            include: {
                quizzes: {
                    include: {
                        attempts: { select: { percentage: true } }
                    }
                }
            }
        });

        const scoreTrend = { labels: [], data: [] };
        const topicMap = {};
        let totalQuizzes = 0;

        courses.forEach((course) => {
            course.quizzes.forEach((quiz) => {
                totalQuizzes++;

                if (quiz.attempts.length === 0) return;

                const avg = quiz.attempts.reduce((sum, a) => sum + a.percentage, 0) / quiz.attempts.length;
                scoreTrend.labels.push(quiz.title);
                scoreTrend.data.push(Math.round(avg));

                if (!topicMap[quiz.topic]) topicMap[quiz.topic] = { total: 0, count: 0 };
                quiz.attempts.forEach(a => {
                    topicMap[quiz.topic].total += a.percentage;
                    topicMap[quiz.topic].count += 1;
                });
            });
        });

        const weakTopics = Object.entries(topicMap)
            .map(([topic, s]) => ({
                topic,
                deficit: Math.round(100 - (s.total / s.count)),
                attempts: s.count
            }))
            .sort((a, b) => b.deficit - a.deficit)
            .slice(0, 5);

        res.status(200).json({
            totalCourses: courses.length,
            totalQuizzes,
            scoreTrend,
            weakTopics
        });

    } catch (error) {
        console.error("Teacher Analytics Error:", error);
        res.status(500).json({ error: "Failed to load teacher analytics." });
    }
};

/**
 * @desc    Get analytics for ONE specific course
 * @route   GET /api/analytics/course/:courseId
 * @access  Private (TEACHER only)
 */
exports.getCourseAnalytics = async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const { courseId } = req.params;

        // Verify this course belongs to this teacher
        const course = await prisma.course.findUnique({ where: { id: courseId } });

        if (!course) return res.status(404).json({ error: "Course not found." });
        if (course.teacherId !== teacherId) return res.status(403).json({ error: "Access denied." });

        const quizzes = await prisma.quiz.findMany({
            where: { courseId },
            orderBy: { createdAt: 'asc' },
            include: {
                attempts: { select: { percentage: true } }
            }
        });

        const scoreTrend = { labels: [], data: [] };
        const topicMap = {};

        quizzes.forEach((quiz) => {
            if (quiz.attempts.length === 0) return;

            const avg = quiz.attempts.reduce((sum, a) => sum + a.percentage, 0) / quiz.attempts.length;
            scoreTrend.labels.push(quiz.title);
            scoreTrend.data.push(Math.round(avg));

            if (!topicMap[quiz.topic]) topicMap[quiz.topic] = { total: 0, count: 0 };
            quiz.attempts.forEach(a => {
                topicMap[quiz.topic].total += a.percentage;
                topicMap[quiz.topic].count += 1;
            });
        });

        const weakTopics = Object.entries(topicMap)
            .map(([topic, s]) => ({
                topic,
                deficit: Math.round(100 - (s.total / s.count)),
                attempts: s.count
            }))
            .sort((a, b) => b.deficit - a.deficit)
            .slice(0, 5);

        res.status(200).json({
            courseName: course.title,
            totalQuizzes: quizzes.length,
            scoreTrend,
            weakTopics
        });

    } catch (error) {
        console.error("Course Analytics Error:", error);
        res.status(500).json({ error: "Failed to load course analytics." });
    }
};