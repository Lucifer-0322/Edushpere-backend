const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(users);
    } catch (error) {
        console.error("Get All Users Error:", error);
        res.status(500).json({ error: "Failed to fetch users." });
    }
};

/**
 * @desc    Delete a user and all their data (Admin only)
 * @route   DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "User not found." });
        if (user.role === "ADMIN") return res.status(403).json({ error: "Cannot delete an admin account." });

        if (user.role === "TEACHER") {
            const courses = await prisma.course.findMany({ where: { teacherId: id } });

            for (const course of courses) {
                const quizzes = await prisma.quiz.findMany({ where: { courseId: course.id } });

                for (const quiz of quizzes) {
                    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
                    await prisma.question.deleteMany({ where: { quizId: quiz.id } });
                }

                await prisma.quiz.deleteMany({ where: { courseId: course.id } });
                await prisma.material.deleteMany({ where: { courseId: course.id } });
                await prisma.enrollment.deleteMany({ where: { courseId: course.id } });
            }

            await prisma.course.deleteMany({ where: { teacherId: id } });
        }

        if (user.role === "STUDENT") {
            await prisma.quizAttempt.deleteMany({ where: { studentId: id } });
            await prisma.enrollment.deleteMany({ where: { studentId: id } });
            await prisma.aILearningInsight.deleteMany({ where: { studentId: id } });
        }

        await prisma.user.delete({ where: { id } });

        res.status(200).json({ message: "User and all associated data deleted successfully." });

    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ error: "Failed to delete user: " + error.message });
    }
};