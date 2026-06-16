/**
 * EduSphere AI - Course Material Controller
 * Handles uploading and listing course syllabus materials.
 * Uses URL-based storage (no real file upload) for simplicity.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Add a new material to a course (Teacher only)
 * @route   POST /api/materials
 * @access  Private (TEACHER)
 */
exports.createMaterial = async (req, res) => {
    try {
        const { title, fileUrl, fileType, courseId } = req.body;

        if (!title || !fileUrl || !fileType || !courseId) {
            return res.status(400).json({ error: "Missing required material fields." });
        }

        const newMaterial = await prisma.material.create({
            data: {
                title,
                fileUrl,
                fileType,
                courseId
            }
        });

        res.status(201).json({ message: "Material uploaded successfully!", material: newMaterial });
    } catch (error) {
        console.error("Material Upload Error:", error);
        res.status(500).json({ error: "Failed to upload material." });
    }
};

/**
 * @desc    Get all materials for a specific course
 * @route   GET /api/materials/:courseId
 * @access  Private
 */
exports.getMaterialsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const materials = await prisma.material.findMany({
            where: { courseId }
        });

        res.status(200).json(materials);
    } catch (error) {
        console.error("Fetch Materials Error:", error);
        res.status(500).json({ error: "Failed to fetch materials." });
    }
};