const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean);

if (API_KEYS.length === 0) {
    throw new Error("No Gemini API keys found. Set GEMINI_API_KEY_1 (and _2, _3) in your .env file.");
}

let currentKeyIndex = 0;

function getClient() {
    const key = API_KEYS[currentKeyIndex];
    return new GoogleGenerativeAI(key);
}

function rotateKey() {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.log(`Rotated to Gemini API key #${currentKeyIndex + 1}`);
}

async function callGeminiWithRetry(modelName, prompt) {
    let lastError;

    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
        try {
            const genAI = getClient();
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(`Gemini call failed on key #${currentKeyIndex + 1}:`, error.message);
            lastError = error;
            rotateKey();
        }
    }

    throw lastError;
}

/**
 * Generates a personalized study recommendation based on wrong quiz answers.
 */
async function generateStudyRecommendation(wrongQuestions, quizTopic) {
    if (!wrongQuestions || wrongQuestions.length === 0) {
        return {
            weakTopic: "None",
            confidenceScore: 1.0,
            recommendation: "Perfect score! You answered every question correctly. Keep up the great work and revisit this topic occasionally to keep your knowledge fresh."
        };
    }

    const wrongList = wrongQuestions.map((q, i) => `
Question ${i + 1}: "${q.questionText}"
  A) ${q.optionA}
  B) ${q.optionB}
  C) ${q.optionC}
  D) ${q.optionD}
  Correct answer: ${q.correctOption}
  Student selected: ${q.studentAnswer}`).join("\n");

    const prompt = `You are an expert university tutor giving personalized feedback to a student who just completed a quiz.

Quiz Topic: "${quizTopic}"
Questions the student got WRONG (${wrongQuestions.length} total):
${wrongList}

Your job:
1. Identify the SPECIFIC sub-concept or skill gap revealed by their wrong answers — not just the general topic name
2. Look at WHAT they picked vs what was correct to diagnose the likely misconception
3. Write a recommendation that feels personal and directly references their actual mistakes

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "weakTopic": "Specific sub-topic or concept (e.g. 'CSS Flexbox axis direction' not just 'CSS')",
  "confidenceScore": 0.75,
  "recommendation": "Write 3-4 sentences. Start by referencing what they got wrong specifically (e.g. 'You selected B for question 2, which suggests you may be confusing X with Y...'). Explain the correct concept clearly in one sentence. End with one concrete action they can take right now (e.g. 'Try re-reading the section on this topic and practice 2-3 similar problems')."
}

confidenceScore meaning: 0.9 = very clear pattern found, 0.7 = likely issue, 0.5 = unclear from limited data.`;

    try {
        const text = await callGeminiWithRetry("gemini-2.0-flash-lite", prompt);
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
            weakTopic: parsed.weakTopic || quizTopic,
            confidenceScore: parseFloat(parsed.confidenceScore) || 0.7,
            recommendation: parsed.recommendation || "Review this topic and try the quiz again."
        };
    } catch (error) {
        console.error("Gemini API Error (all keys failed):", error.message);
        return {
            weakTopic: quizTopic,
            confidenceScore: 0.5,
            recommendation: `You missed ${wrongQuestions.length} question(s) on ${quizTopic}. Review the course material carefully and retake the quiz to improve your score.`
        };
    }
}

/**
 * Generates a professional course description from just a title.
 */
async function generateCourseDescription(title) {
    const prompt = `You are a professional academic curriculum designer writing for a university course catalogue.

Write a compelling 2-3 sentence course description for a university course titled "${title}".

- Sentence 1: What the course is about and its core purpose
- Sentence 2: Key topics or technologies students will study
- Sentence 3: What practical skills or outcomes students will gain

Tone: Clear, professional, and motivating.
Return ONLY the description text — no labels, no markdown, no surrounding quotation marks.`;

    const text = await callGeminiWithRetry("gemini-2.0-flash-lite", prompt);
    const description = text.trim();

    if (!description) {
        throw new Error("Gemini returned an empty description.");
    }

    return description;
}

/**
 * Analyzes a student's full quiz history and produces a personalized report card.
 */
async function generatePerformanceReport(performanceSummary, totalAvg) {
    const prompt = `You are an expert academic tutor and learning coach analyzing a university student's quiz performance.

STUDENT PERFORMANCE DATA:
${performanceSummary}

Overall average: ${totalAvg}%

Be specific — use the actual topic names from the data above. Do not give generic advice.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "overallGrade": "A, B, C, D, or F — use: A=90%+, B=75-89%, C=60-74%, D=45-59%, F=below 45%",
  "strengths": ["exact topic names where student scored 70% or above"],
  "weakAreas": ["exact topic names where student scored below 60%"],
  "studyPlan": [
    "Step 1: specific action targeting their single weakest topic by name",
    "Step 2: technique or resource for their second weakest area",
    "Step 3: how to maintain and reinforce their strongest topics"
  ],
  "motivationalMessage": "one personalised encouraging sentence referencing their actual progress or a specific strength"
}`;

    const text = await callGeminiWithRetry("gemini-2.0-flash-lite", prompt);
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
        overallGrade: parsed.overallGrade || "N/A",
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [],
        studyPlan: Array.isArray(parsed.studyPlan) ? parsed.studyPlan : [],
        motivationalMessage: parsed.motivationalMessage || ""
    };
}

/**
 * Generates multiple-choice quiz questions for a given topic.
 */
async function generateQuizQuestions(topic, count) {
    const prompt = `You are an experienced university lecturer creating a multiple choice quiz.

Generate exactly ${count} high-quality multiple choice questions about "${topic}" for university-level students.

Rules:
- Each question must test genuine understanding, not just memorisation of definitions
- Cover different aspects: concepts, applications, and problem-solving
- All 4 options must be plausible — no obviously wrong distractors
- Only one option must be clearly correct
- Vary which letter (A/B/C/D) is the correct answer across questions

Return ONLY a valid JSON array (no markdown, no backticks, no extra text):
[
  {
    "questionText": "Clear, specific question about ${topic}?",
    "optionA": "Plausible option",
    "optionB": "Plausible option",
    "optionC": "Plausible option",
    "optionD": "Plausible option",
    "correctOption": "A"
  }
]

Return exactly ${count} questions. correctOption must be A, B, C, or D only.`;

    const text = await callGeminiWithRetry("gemini-2.0-flash-lite", prompt);
    const cleaned = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions)) {
        throw new Error("Gemini did not return a valid array of questions.");
    }

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