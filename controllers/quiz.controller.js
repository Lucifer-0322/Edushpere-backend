/**
 * EduSphere AI - Quiz Assessment Engine Controller
 * Handles quiz loading, compilation, and automated server-side evaluation.
 */

const { PrismaClient } = require('@prisma/client');
const { generateStudyRecommendation } = require('../services/gemini.service');
const prisma = new PrismaClient();

/**
 * @desc    Get quiz questions (Strips out correct answers to prevent front-end cheating)
 * @route   GET /api/quizzes/:id
 * @access  Private (STUDENT & TEACHER)
 */
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

/**
 * @desc    Submit answers for automated server-side grading + AI recommendation
 * @route   POST /api/quizzes/:id/submit
 * @access  Private (STUDENT only)
 */
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

        // Save the quiz attempt first — this must succeed regardless of AI availability
        await prisma.quizAttempt.create({
            data: {
                score: parseFloat(score),
                totalMarks: parseFloat(totalMarks),
                percentage: parseFloat(percentage),
                studentId,
                quizId: id
            }
        });

        // Call Gemini AI to generate a real, personalized recommendation
        const aiResult = await generateStudyRecommendation(wrongQuestions, quiz.topic);

        // Save the AI insight tied to this student
        const savedInsight = await prisma.aILearningInsight.create({
            data: {
                weakTopic: aiResult.weakTopic,
                confidenceScore: aiResult.confidenceScore,
                recommendation: aiResult.recommendation,
                studentId
            }
        });

        // Return score AND the fresh AI recommendation in the same response
        res.status(200).json({
            score,
            totalMarks,
            percentage,
            aiInsight: {
                weakTopic: savedInsight.weakTopic,
                recommendation: savedInsight.recommendation,
                confidenceScore: savedInsight.confidenceScore
            }
        });

    } catch (error) {
        console.error("Grading Engine Submission Exception:", error);
        res.status(500).json({ error: "Failed to compile evaluation metrics grading criteria." });
    }
};

/**
 * @desc    Create a new Quiz with matching structural multiple choice questions
 * @route   POST /api/quizzes
 * @access  Private (TEACHER only)
 */
exports.createQuiz = async (req, res) => {
    try {
        const { title, topic, courseId, questions } = req.body;

        if (!title || !topic || !courseId || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: "Missing structural parameters or questions payload array format." });
        }

        const courseExists = await prisma.course.findUnique({ where: { id: courseId } });
        if (!courseExists) {
            return res.status(404).json({ error: `Course with ID ${courseId} does not exist.` });
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

        res.status(201).json({ message: "Quiz compiled and posted successfully!", quiz: newQuiz });
    } catch (error) {
        console.error("Quiz Compilation Failure:", error);
        res.status(500).json({ error: "Failed to persist new structural test parameters configurations." });
    }
};