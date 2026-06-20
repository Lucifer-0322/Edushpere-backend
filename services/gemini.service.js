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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

module.exports = { generateStudyRecommendation };