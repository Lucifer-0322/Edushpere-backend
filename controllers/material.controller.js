/**
 * EduSphere AI - Course Material Controller
 * Handles uploading and listing course syllabus materials.
 * Uses URL-based storage (no real file upload) for simplicity.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Add a new material to a course (Teacher only — own courses)
 * @route   POST /api/materials
 * @access  Private (TEACHER)
 */
exports.createMaterial = async (req, res) => {
    try {
        const { title, fileUrl, fileType, courseId } = req.body;
        const teacherId = req.user.userId;

        if (!title || !fileUrl || !fileType || !courseId) {
            return res.status(400).json({ error: "Missing required material fields." });
        }

        // ✅ Ownership check — teacher can only upload to their OWN courses
        const course = await prisma.course.findUnique({ where: { id: courseId } });

        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        if (course.teacherId !== teacherId) {
            return res.status(403).json({ error: "You can only upload materials to your own courses." });
        }

        const newMaterial = await prisma.material.create({
            data: { title, fileUrl, fileType, courseId }
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

/**
 * @desc    Delete a material (Teacher — own course only)
 * @route   DELETE /api/materials/:id
 * @access  Private (TEACHER)
 */
exports.deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.userId;

        const material = await prisma.material.findUnique({
            where: { id },
            include: { course: true }
        });

        if (!material) {
            return res.status(404).json({ error: "Material not found." });
        }

        if (material.course.teacherId !== teacherId) {
            return res.status(403).json({ error: "You can only delete materials from your own courses." });
        }

        await prisma.material.delete({ where: { id } });

        res.status(200).json({ message: "Material deleted successfully!" });
    } catch (error) {
        console.error("Delete Material Error:", error);
        res.status(500).json({ error: "Failed to delete material." });
    }
};