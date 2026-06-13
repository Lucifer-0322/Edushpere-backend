/**
 * EduSphere AI - Database Seeding Script
 * Populates PostgreSQL via Prisma with mock accounts, courses, and quiz criteria.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting database seeding cleanup...");
    
    // Clear existing records to avoid unique constraint duplicates during re-runs
    await prisma.aiLearningInsight.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.material.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.user.deleteMany({});

    console.log("🔒 Creating encrypted password profiles...");
    const salt = await bcrypt.genSalt(10);
    const studentPassword = await bcrypt.hash("student123", salt);
    const teacherPassword = await bcrypt.hash("teacher123", salt);
    const adminPassword = await bcrypt.hash("admin123", salt);

    // 1. CREATE CORE IDENTITY PROFILES
    console.log("👥 Inserting user roles into identity tables...");
    
    const student = await prisma.user.create({
        data: {
            name: "Ali Raza",
            email: "ali.raza@student.edu",
            password: studentPassword,
            role: "STUDENT"
        }
    });

    const teacher = await prisma.user.create({
        data: {
            name: "Ma'am Hina Mahmood",
            email: "hina.mahmood@faculty.edu",
            password: teacherPassword,
            role: "TEACHER"
        }
    });

    const admin = await prisma.user.create({
        data: {
            name: "System Administrator",
            email: "admin@edusphere.edu",
            password: adminPassword,
            role: "ADMIN"
        }
    });

    // 2. CREATE A CLASSROOM PATHWAY
    console.log("📚 Publishing mock classroom track...");
    const course = await prisma.course.create({
        data: {
            title: "Introduction to Web Technologies",
            description: "Master structural HTML5 templates, style matching via custom layout workflows, and modern responsive design mechanics.",
            teacherId: teacher.id
        }
    });

    // 3. ENROLL THE STUDENT
    console.log("✏️ enrolling student identity into class mapping...");
    await prisma.enrollment.create({
        data: {
            studentId: student.id,
            courseId: course.id
        }
    });

    // 4. ATTACH SYLLABUS MATERIALS (Mock Cloudinary URLs)
    console.log("📄 Uploading course syllabus reference documents...");
    await prisma.material.create({
        data: {
            title: "Lesson 1: Semantic Document Structures",
            fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
            fileType: "pdf",
            courseId: course.id
        }
    });

    // 5. CONFIGURE QUIZ ASSESSMENT ENGINE DATA
    console.log("📝 Generating structural test quiz data layout...");
    const quiz = await prisma.quiz.create({
        data: {
            title: "Quiz 1: Core Layout Fundamentals",
            topic: "CSS Layouts",
            courseId: course.id
        }
    });

    console.log("❓ Populating assessment objective questions...");
    await prisma.question.create({
        data: {
            questionText: "Which HTML5 element is specifically used to define independent, self-contained content layout zones?",
            optionA: "<div>",
            optionB: "<article>",
            optionC: "<section>",
            optionD: "<aside>",
            correctOption: "B",
            quizId: quiz.id
        }
    });

    // 6. MAP PLACEHOLDER GEMINI AI DYNAMIC INSIGHTS
    console.log("✨ Simulating Google Gemini AI analysis logs...");
    await prisma.aiLearningInsight.create({
        data: {
            weakTopic: "CSS Flexbox Layouts",
            confidenceScore: 0.88,
            recommendation: "Your scores dropped in container nesting vectors during the layout fundamentals quiz. We recommend checking out the Lesson 1 guidelines and practicing cross-axis alignment rules.",
            studentId: student.id
        }
    });

    console.log("🏁 Database environment successfully seeded with mock data values!");
}

main()
    .catch((e) => {
        console.error("❌ Exception broken during seeding operations:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });