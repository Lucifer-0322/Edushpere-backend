/**
 * EduSphere AI - Quiz Assessment Engine Controller
 * Handles quiz loading, compilation, and automated server-side evaluation.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateStudyRecommendation } = require('../services/gemini.service');

/**
 * @desc    Get quiz questions (strips correct answers)
 * @route   GET /api/quizzes/:id
 * @access  Private (STUDENT & TEACHER)
 */
exports.getQuizById = async (req, res) => {
    try {
        const { id } = req.params;

        const quiz = await prisma.quiz.findUnique({
            where: { id },
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

/**
 * @desc    Submit answers for automated grading + AI recommendation
 * @route   POST /api/quizzes/:id/submit
 * @access  Private (STUDENT only)
 */
exports.submitQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;
        const studentId = req.user.userId;

        if (!answers) {
            return res.status(400).json({ error: "Payload missing selected answers." });
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id },
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

        // Save quiz attempt
        await prisma.quizAttempt.create({
            data: {
                score: parseFloat(score),
                totalMarks: parseFloat(totalMarks),
                percentage: parseFloat(percentage),
                studentId,
                quizId: id
            }
        });

        // Call Gemini AI for personalized recommendation
        let aiInsight = null;
        try {
            const aiResult = await generateStudyRecommendation(wrongQuestions, quiz.topic);
            const savedInsight = await prisma.aILearningInsight.create({
                data: {
                    weakTopic: aiResult.weakTopic,
                    confidenceScore: aiResult.confidenceScore,
                    recommendation: aiResult.recommendation,
                    studentId
                }
            });
            aiInsight = {
                weakTopic: savedInsight.weakTopic,
                recommendation: savedInsight.recommendation,
                confidenceScore: savedInsight.confidenceScore
            };
        } catch (aiError) {
            console.error("Gemini AI Error (non-fatal):", aiError.message);
            // AI failure never blocks the quiz result
        }

        res.status(200).json({ score, totalMarks, percentage, aiInsight });

    } catch (error) {
        console.error("Grading Engine Submission Exception:", error);
        res.status(500).json({ error: "Failed to compile evaluation metrics." });
    }
};

/**
 * @desc    Create a new quiz with questions (only on courses the teacher owns)
 * @route   POST /api/quizzes
 * @access  Private (TEACHER only)
 */
exports.createQuiz = async (req, res) => {
    try {
        const { title, topic, courseId, questions } = req.body;
        const teacherId = req.user.userId;

        if (!title || !topic || !courseId || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const course = await prisma.course.findUnique({ where: { id: courseId } });

        if (!course) {
            return res.status(404).json({ error: `Course with ID ${courseId} does not exist.` });
        }

        // ✅ Ownership check — teacher can only add quizzes to their OWN courses
        if (course.teacherId !== teacherId) {
            return res.status(403).json({ error: "You can only add quizzes to your own courses." });
        }

        for (const q of questions) {
            if (!["A", "B", "C", "D"].includes(q.correctOption.toUpperCase())) {
                return res.status(400).json({ error: `Invalid correctOption "${q.correctOption}" — must be A, B, C, or D.` });
            }
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
                        correctOption: q.correctOption.toUpperCase()
                    }))
                }
            }
        });

        res.status(201).json({ message: "Quiz created successfully!", quiz: newQuiz });
    } catch (error) {
        console.error("Quiz Creation Error:", error);
        res.status(500).json({ error: "Failed to create quiz." });
    }
};

/**
 * @desc    Delete a quiz (Teacher — own only / Admin — any)
 * @route   DELETE /api/quizzes/:id
 * @access  Private (TEACHER or ADMIN)
 */
exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: { course: true }
        });

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }

        // Teacher can only delete quiz from their OWN course
        // Admin can delete any quiz
        if (quiz.course.teacherId !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: "You can only delete quizzes from your own courses." });
        }

        // Delete dependent records first to avoid foreign key errors
        await prisma.quizAttempt.deleteMany({ where: { quizId: id } });
        await prisma.question.deleteMany({ where: { quizId: id } });
        await prisma.quiz.delete({ where: { id } });

        res.status(200).json({ message: "Quiz deleted successfully." });
    } catch (error) {
        console.error("Delete Quiz Error:", error);
        res.status(500).json({ error: "Failed to delete quiz." });
    }
};