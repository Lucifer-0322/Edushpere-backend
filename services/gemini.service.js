const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateStudyRecommendation(wrongQuestions, quizTopic) {
    if (!wrongQuestions || wrongQuestions.length === 0) {
        return {
            weakTopic: "None",
            confidenceScore: 1.0,
            recommendation: "Great work! You answered all questions correctly. Keep practicing to maintain your strong understanding."
        };
    }

    const wrongList = wrongQuestions.map(q => `- "${q.questionText}"`).join("\n");

    const prompt = `
You are an educational AI assistant analyzing a student's quiz performance.

Quiz Topic: ${quizTopic}

The student answered these questions INCORRECTLY:
${wrongList}

Respond with ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "weakTopic": "specific topic the student is struggling with",
  "confidenceScore": 0.85,
  "recommendation": "2-3 sentence actionable study suggestion"
}
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
            weakTopic: parsed.weakTopic || quizTopic,
            confidenceScore: parseFloat(parsed.confidenceScore) || 0.7,
            recommendation: parsed.recommendation || "Review this topic and try the quiz again."
        };
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        return {
            weakTopic: quizTopic,
            confidenceScore: 0.5,
            recommendation: `You missed ${wrongQuestions.length} question(s) on ${quizTopic}. Review the course material and retake the quiz.`
        };
    }
}

/**
 * Generates a short, professional course description from just a title.
 * Used by the AI Course Description Generator feature (teacher-facing).
 */
async function generateCourseDescription(title) {
    const prompt = `Write a professional 2-3 sentence course description for a university course titled "${title}".
Mention what students will learn and what skills they will gain.
Be clear, engaging, and academic.
Return ONLY the description text — no labels, no markdown, no surrounding quotation marks.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const description = result.response.text().trim();

    if (!description) {
        throw new Error("Gemini returned an empty description.");
    }

    return description;
}

/**
 * Analyzes a student's full quiz attempt history and produces a
 * personalized report card: grade, strengths, weak areas, study plan.
 * Used by the AI Performance Report feature (student-facing).
 */
async function generatePerformanceReport(performanceSummary, totalAvg) {
    const prompt = `You are an educational AI assistant. Analyze this student's quiz performance history:

${performanceSummary}

Overall average: ${totalAvg}%

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "overallGrade": "A or B or C or D or F",
  "strengths": ["topic1", "topic2"],
  "weakAreas": ["topic1", "topic2"],
  "studyPlan": ["Step 1: action", "Step 2: action", "Step 3: action"],
  "motivationalMessage": "one encouraging sentence"
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    return {
        overallGrade: parsed.overallGrade || "N/A",
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [],
        studyPlan: Array.isArray(parsed.studyPlan) ? parsed.studyPlan : [],
        motivationalMessage: parsed.motivationalMessage || ""
    };
}

/**
 * Generates a set of multiple-choice quiz questions for a given topic.
 * Used by the AI Quiz Generator feature (teacher-facing).
 */
async function generateQuizQuestions(topic, count) {
    const prompt = `Generate exactly ${count} multiple choice questions about "${topic}" for a university-level course.

Return ONLY a valid JSON array (no markdown, no backticks, no extra text):
[
  {
    "questionText": "The question here?",
    "optionA": "First option",
    "optionB": "Second option",
    "optionC": "Third option",
    "optionD": "Fourth option",
    "correctOption": "A"
  }
]

Rules:
- correctOption must be exactly A, B, C, or D
- Questions must be clear and educational
- All 4 options must be distinct and plausible
- Return exactly ${count} questions`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);

    if (!Array.isArray(questions)) {
        throw new Error("Gemini did not return a valid array of questions.");
    }

    // Validate + normalize each question so bad AI output never reaches the DB
    return questions.map((q, i) => {
        const correct = String(q.correctOption || "").trim().toUpperCase();
        if (!q.questionText || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
            throw new Error(`Question ${i + 1} is missing required fields.`);
        }
        if (!["A", "B", "C", "D"].includes(correct)) {
            throw new Error(`Question ${i + 1} has an invalid correctOption "${q.correctOption}".`);
        }
        return {
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: correct
        };
    });
}

module.exports = {
    generateStudyRecommendation,
    generateCourseDescription,
    generatePerformanceReport,
    generateQuizQuestions
};