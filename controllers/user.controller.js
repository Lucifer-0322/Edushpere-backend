exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "User not found." });
        if (user.role === "ADMIN") return res.status(403).json({ error: "Cannot delete an admin account." });

        if (user.role === "TEACHER") {
            // Get all courses owned by this teacher
            const courses = await prisma.course.findMany({ where: { teacherId: id } });
            
            for (const course of courses) {
                // Get all quizzes in this course
                const quizzes = await prisma.quiz.findMany({ where: { courseId: course.id } });
                
                for (const quiz of quizzes) {
                    // Delete quiz attempts and questions first
                    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
                    await prisma.question.deleteMany({ where: { quizId: quiz.id } });
                }

                // Delete quizzes, materials, enrollments
                await prisma.quiz.deleteMany({ where: { courseId: course.id } });
                await prisma.material.deleteMany({ where: { courseId: course.id } });
                await prisma.enrollment.deleteMany({ where: { courseId: course.id } });
            }

            // Delete all courses
            await prisma.course.deleteMany({ where: { teacherId: id } });
        }

        if (user.role === "STUDENT") {
            // Delete student's quiz attempts, enrollments and AI insights
            await prisma.quizAttempt.deleteMany({ where: { studentId: id } });
            await prisma.enrollment.deleteMany({ where: { studentId: id } });
            await prisma.aILearningInsight.deleteMany({ where: { studentId: id } });
        }

        // Finally delete the user
        await prisma.user.delete({ where: { id } });

        res.status(200).json({ message: "User and all associated data deleted successfully." });

    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ error: "Failed to delete user: " + error.message });
    }
};