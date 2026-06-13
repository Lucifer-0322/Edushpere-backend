/**
 * EduSphere AI - Course Management Controller
 * Handles classroom lifecycle operations and student enrollment visibility.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Fetch all courses (Used by the Student Dashboard)
 * @route   GET /api/courses
 */
exports.getAllCourses = async (req, res) => {
    try {
        // Retrieve all courses including the teacher's name for the UI
        const courses = await prisma.course.findMany({
            include: {
                teacher: {
                    select: { name: true }
                }
            }
        });
        res.status(200).json(courses);
    } catch (error) {
        console.error("Fetch Courses Error:", error);
        res.status(500).json({ error: "Failed to retrieve classroom data." });
    }
};

/**
 * @desc    Get a single course with its materials and quizzes
 * @route   GET /api/courses/:id
 */
exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                teacher: { select: { name: true } },
                materials: true, // Includes Cloudinary hosted assets
                quizzes: {
                    select: { id: true, title: true, topic: true }
                }
            }
        });

        if (!course) {
            return res.status(404).json({ error: "Course identity not found." });
        }

        res.status(200).json(course);
    } catch (error) {
        res.status(500).json({ error: "Internal server error fetching course details." });
    }
};

/**
 * @desc    Create a new course (Teacher only)
 * @route   POST /api/courses
 */
exports.createCourse = async (req, res) => {
    try {
        const { title, description } = req.body;
        const teacherId = req.user.userId; // Extracted from verifyToken middleware

        if (!title || !description) {
            return res.status(400).json({ error: "Course title and description are required." });
        }

        const newCourse = await prisma.course.create({
            data: {
                title,
                description,
                teacherId
            }
        });

        res.status(201).json({ message: "Course published successfully!", course: newCourse });
    } catch (error) {
        res.status(500).json({ error: "Failed to publish course profile." });
    }
};