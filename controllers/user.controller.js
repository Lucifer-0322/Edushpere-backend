const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllUsers = async (req, res) => {
    try {
        // Fetch all users, but don't send passwords back to the frontend!
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true }
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users." });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user." });
    }
};