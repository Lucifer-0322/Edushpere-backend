/**
 * EduSphere AI - Quiz Assessment Engine Controller
 * Handles quiz loading, compilation, and automated server-side evaluation.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateLearningInsight } = require('../services/gemini.service');

exports.getQuizById = async (req, res) => {
    try {
        const { id } = req.params;

        const quiz = await prisma.quiz.findUnique({
            where: { id: id },
            include: {
                questions: {
                    select: {
                        id: true,
                        questionText: true,
                        optionA: true,
                        optionB: true,
                        optionC: true,
                        optionD: true
                    }
                }
            }
        });

        if (!quiz) {
            return res.status(404).json({ error: "Assessment instance not found." });
        }

        res.status(200).json(quiz);
    } catch (error) {
        console.error("Fetch Quiz Error:", error);
        res.status(500).json({ error: "Internal server error fetching quiz schema." });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;
        const studentId = req.user.userId;

        if (!answers) {
            return res.status(400).json({ error: "Payload missing selected answers stack." });
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: id },
            include: { questions: true }
        });

        if (!quiz) {
            return res.status(404).json({ error: "Target quiz not found." });
        }

        let score = 0;
        const totalMarks = quiz.questions.length;
        const wrongQuestions = [];

        quiz.questions.forEach((question) => {
            const studentAnswer = answers[question.id];
            if (studentAnswer && studentAnswer.toUpperCase() === question.correctOption.toUpperCase()) {
                score++;
            } else {
                wrongQuestions.push({ questionText: question.questionText });
            }
        });

        const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

        await prisma.quizAttempt.create({
            data: {
                score: parseFloat(score),
                totalMarks: parseFloat(totalMarks),
                percentage: parseFloat(percentage),
                studentId,
                quizId: id
            }
        });

        // Generate AI learning insight if student got anything wrong
        let aiInsight = null;
        if (wrongQuestions.length > 0) {
            aiInsight = await generateLearningInsight(wrongQuestions, quiz.topic);

            await prisma.aILearningInsight.create({
                data: {
                    weakTopic: aiInsight.weakTopic,
                    confidenceScore: aiInsight.confidenceScore,
                    recommendation: aiInsight.recommendation,
                    studentId
                }
            });
        }

        res.status(200).json({ score, totalMarks, percentage, aiInsight });

    } catch (error) {
        console.error("Grading Engine Submission Exception:", error);
        res.status(500).json({ error: "Failed to compile evaluation metrics grading criteria." });
    }
};

exports.createQuiz = async (req, res) => {
    try {
        const { title, topic, courseId, questions } = req.body;

        if (!title || !topic || !courseId || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: "Missing structural parameters or questions payload array format." });
        }

        const newQuiz = await prisma.quiz.create({
            data: {
                title,
                topic,
                courseId,
                questions: {
                    create: questions.map((q) => ({
                        questionText: q.questionText,
                        optionA: q.optionA,
                        optionB: q.optionB,
                        optionC: q.optionC,
                        optionD: q.optionD,
                        correctOption: q.correctOption
                    }))
                }
            }
        });

        res.status(201).json({ message: "Quiz compiled and posted successfully!", quiz: newQuiz });
    } catch (error) {
        console.error("Quiz Compilation Failure:", error);
        res.status(500).json({ error: "Failed to persist new structural test parameters configurations." });
    }
};

/**
 * @desc    Delete a quiz and its related questions/attempts
 * @route   DELETE /api/quizzes/:id
 * @access  Private (TEACHER only)
 */
exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        const quiz = await prisma.quiz.findUnique({ where: { id } });

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }

        // Delete dependent records first
        await prisma.quizAttempt.deleteMany({ where: { quizId: id } });
        await prisma.question.deleteMany({ where: { quizId: id } });
        await prisma.quiz.delete({ where: { id } });

        res.status(200).json({ message: "Quiz deleted successfully!" });
    } catch (error) {
        console.error("Delete Quiz Error:", error);
        res.status(500).json({ error: "Failed to delete quiz." });
    }
};
/**
 * @desc    Delete a quiz (Teacher only — and only their own quiz)
 * @route   DELETE /api/quizzes/:id
 * @access  Private (TEACHER only)
 */
exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.userId;

        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: { course: true }
        });

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }

        // Security: a teacher can only delete a quiz under their OWN course
        if (quiz.course.teacherId !== teacherId) {
            return res.status(403).json({ error: "You can only delete quizzes from your own courses." });
        }

        await prisma.quiz.delete({ where: { id } });

        res.status(200).json({ message: "Quiz deleted successfully." });
    } catch (error) {
        console.error("Delete Quiz Error:", error);
        res.status(500).json({ error: "Failed to delete quiz." });
    }
};
// Security: a teacher can only delete a quiz under their OWN course, Admins can delete ANY
if (quiz.course.teacherId !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: "Unauthorized. You can only delete quizzes from your own courses." });
}