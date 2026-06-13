/**
 * EduSphere AI - Quiz Assessment Engine Controller
 * Handles quiz loading, compilation, and automated server-side evaluation.
 */

const { PrismaClient } = require('@prisma/client');
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
                        // Exclude 'correctOption' so students cannot see answers in dev-tools
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
 * @desc    Submit answers for automated server-side grading
 * @route   POST /api/quizzes/:id/submit
 * @access  Private (STUDENT only)
 */
exports.submitQuiz = async (req, res) => {
    try {
        const { id } = req.params; 
        const { answers } = req.body; // Expects JSON map: { "question_1_id": "B", "question_2_id": "A" }
        const studentId = req.user.userId;

        if (!answers) {
            return res.status(400).json({ error: "Payload missing selected answers stack." });
        }

        // 1. Fetch original quiz questions containing correct options keys from PostgreSQL
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: { questions: true }
        });

        if (!quiz) {
            return res.status(404).json({ error: "Target quiz not found." });
        }

        let score = 0;
        const totalMarks = quiz.questions.length;

        // 2. Automated Grading Engine Loop
        quiz.questions.forEach((question) => {
            // Map question parameters keys against submitted payload answers
            const studentAnswer = answers[question.id]; 
            if (studentAnswer && studentAnswer.toUpperCase() === question.correctOption.toUpperCase()) {
                score++;
            }
        });

        const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

        // 3. Log user attempt metrics records inside database tables
        await prisma.quizAttempt.create({
            data: {
                score: parseFloat(score),
                totalMarks: parseFloat(totalMarks),
                percentage: parseFloat(percentage),
                studentId,
                quizId: id
            }
        });

        // 4. Return structural performance results back to fetch payload response
        res.status(200).json({
            score,
            totalMarks,
            percentage
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

        // Generate Quiz structure along with nested target objective question mappings
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
                        correctOption: q.correctOption // Expects "A", "B", "C", or "D"
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