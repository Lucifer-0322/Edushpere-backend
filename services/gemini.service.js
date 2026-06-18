/**
 * EduSphere AI - Google Gemini Integration Service
 * Sends quiz performance data to Gemini and returns structured
 * weak-topic + recommendation JSON for the AI Diagnostics panel.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @param {Array} wrongQuestions - [{ questionText, topic }]
 * @param {string} quizTopic - overall topic of the quiz
 * @returns {Promise<{weakTopic: string, confidenceScore: number, recommendation: string}>}
 */
async function generateStudyRecommendation(wrongQuestions, quizTopic) {
    // If the student got everything right, there's nothing to recommend
    if (!wrongQuestions || wrongQuestions.length === 0) {
        return {
            weakTopic: "None",
            confidenceScore: 1.0,
            recommendation: "Great work! You answered all questions correctly. Keep practicing to maintain your strong understanding of this topic."
        };
    }

    const wrongList = wrongQuestions.map(q => `- "${q.questionText}"`).join("\n");

    const prompt = `
You are an educational AI assistant analyzing a student's quiz performance.

Quiz Topic: ${quizTopic}

The student answered these questions INCORRECTLY:
${wrongList}

Based on this, respond with ONLY a valid JSON object (no markdown, no backticks, no extra text) in this exact format:
{
  "weakTopic": "a short specific topic name the student is struggling with",
  "confidenceScore": a number between 0 and 1 representing how confident you are in this diagnosis,
  "recommendation": "a 2-3 sentence actionable study suggestion for this specific student"
}
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Strip markdown code fences if Gemini adds them despite instructions
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
            weakTopic: parsed.weakTopic || quizTopic,
            confidenceScore: parseFloat(parsed.confidenceScore) || 0.7,
            recommendation: parsed.recommendation || "Review this topic and try the quiz again."
        };

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        // Fallback so a Gemini failure never breaks quiz submission
        return {
            weakTopic: quizTopic,
            confidenceScore: 0.5,
            recommendation: `You missed ${wrongQuestions.length} question(s) on ${quizTopic}. We recommend reviewing the related course material and retaking the quiz.`
        };
    }
}

module.exports = { generateStudyRecommendation };