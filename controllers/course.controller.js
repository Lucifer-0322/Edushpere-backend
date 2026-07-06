/**
 * EduSphere AI - Course Management Controller
 * Handles classroom lifecycle operations and student enrollment visibility.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Fetch all courses with enrollment and quiz counts
 * @route   GET /api/courses
 */
exports.getAllCourses = async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                teacher: {
                    select: { name: true }
                },
                quizzes: {
                    select: { id: true, title: true }
                },
                _count: {
                    select: {
                        enrollments: true,
                        quizzes: true
                    }
                }
            }
        });
        res.status(200).json(courses);
    } catch (error) {
        console.error("Fetch Courses Error:", error);
        res.status(500).json({ error: "Failed to retrieve classroom data." });
    }
};

/**
 * @desc    Fetch ONLY the logged-in teacher's own courses
 * @route   GET /api/courses/my-courses
 * @access  Private (TEACHER only)
 */
exports.getMyCourses = async (req, res) => {
    try {
        const teacherId = req.user.userId;

        const courses = await prisma.course.findMany({
            where: { teacherId },
            include: {
                quizzes: { select: { id: true, title: true } },
                enrollments: { select: { id: true } },
                _count: {
                    select: {
                        enrollments: true,
                        quizzes: true
                    }
                }
            }
        });

        res.status(200).json(courses);
    } catch (error) {
        console.error("Fetch My Courses Error:", error);
        res.status(500).json({ error: "Failed to retrieve your courses." });
    }
};

/**
 * @desc    Get a single course with its materials and quizzes.
 *          For STUDENT requests, each quiz also includes an "attempted"
 *          boolean so the frontend can render a progress bar.
 * @route   GET /api/courses/:id
 */
exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                teacher: { select: { name: true } },
                materials: true,
                quizzes: {
                    select: { id: true, title: true, topic: true }
                }
            }
        });

        if (!course) {
            return res.status(404).json({ error: "Course identity not found." });
        }

        // Attach "attempted" flag per quiz when the requester is a student
        if (req.user && req.user.role === 'STUDENT' && course.quizzes.length > 0) {
            const studentId = req.user.userId;
            const quizIds = course.quizzes.map(q => q.id);

            const attempts = await prisma.quizAttempt.findMany({
                where: {
                    studentId,
                    quizId: { in: quizIds }
                },
                select: { quizId: true }
            });

            const attemptedQuizIds = new Set(attempts.map(a => a.quizId));

            course.quizzes = course.quizzes.map(q => ({
                ...q,
                attempted: attemptedQuizIds.has(q.id)
            }));
        }

        res.status(200).json(course);
    } catch (error) {
        res.status(500).json({ error: "Internal server error fetching course details." });
    }
};

/**
 * @desc    Create a new course (Teacher only)
 * @route   POST /api/courses
 */
exports.createCourse = async (req, res) => {
    try {
        const { title, description } = req.body;
        const teacherId = req.user.userId;

        if (!title || !description) {
            return res.status(400).json({ error: "Course title and description are required." });
        }

        const newCourse = await prisma.course.create({
            data: {
                title,
                description,
                teacherId
            }
        });

        res.status(201).json({ message: "Course published successfully!", course: newCourse });
    } catch (error) {
        res.status(500).json({ error: "Failed to publish course profile." });
    }
};

/**
 * @desc    Delete a course (Teacher — own only / Admin — any)
 * @route   DELETE /api/courses/:id
 * @access  Private (TEACHER or ADMIN)
 */
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await prisma.course.findUnique({ where: { id } });

        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        if (course.teacherId !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: "You can only delete your own courses." });
        }

        await prisma.course.delete({ where: { id } });

        res.status(200).json({ message: "Course deleted successfully." });
    } catch (error) {
        console.error("Delete Course Error:", error);
        res.status(500).json({ error: "Failed to delete course." });
    }
};

/**
 * @desc    Get top-5 leaderboard for a course, based on each student's
 *          best quiz attempt percentage across all quizzes in the course
 * @route   GET /api/courses/:id/leaderboard
 * @access  Private (STUDENT & TEACHER)
 */
exports.getCourseLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;

        const quizzes = await prisma.quiz.findMany({
            where: { courseId: id },
            select: { id: true }
        });

        const quizIds = quizzes.map(q => q.id);

        if (quizIds.length === 0) {
            return res.status(200).json({ leaderboard: [] });
        }

        const attempts = await prisma.quizAttempt.findMany({
            where: { quizId: { in: quizIds } },
            include: {
                student: { select: { id: true, name: true } }
            }
        });

        const bestByStudent = {};

        attempts.forEach(attempt => {
            const studentId = attempt.student.id;
            if (!bestByStudent[studentId] || attempt.percentage > bestByStudent[studentId].percentage) {
                bestByStudent[studentId] = {
                    name: attempt.student.name,
                    percentage: attempt.percentage
                };
            }
        });

        const leaderboard = Object.values(bestByStudent)
            .map(entry => ({
                name: entry.name,
                average: Math.round(entry.percentage)
            }))
            .sort((a, b) => b.average - a.average)
            .slice(0, 5);

        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error("Fetch Leaderboard Error:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard." });
    }
};