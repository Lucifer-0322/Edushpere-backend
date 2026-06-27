/**
 * EduSphere AI - Authentication Controller
 * Handles business logic for user identity registration and secure login.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

/**
 * Register a new user profile
 */
exports.register = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;

        // 1. Basic validation parameters check
        if (!name || !email || !role || !password) {
            return res.status(400).json({ error: "All profile registration fields are required." });
        }

        // 2. Check if user already exists in PostgreSQL
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "An account with this email address already exists." });
        }

        // 3. Security: Hash the raw password before storage
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Commit to database via Prisma ORM
        await prisma.user.create({
            data: {
                name,
                email,
                role,
                password: hashedPassword
            }
        });

        res.status(201).json({ message: "User identity configuration committed successfully!" });

    } catch (error) {
        console.error("Registration Exception Logged:", error);
        res.status(500).json({ error: "Internal server processing failure during registration." });
    }
};

/**
 * Authenticate credentials and generate session token
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password parameters must be supplied." });
        }

        // 1. Locate user profile in database
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credential parameters provided." });
        }

        // 2. Compare incoming password with encrypted hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credential parameters provided." });
        }

        // 3. Sign Secure JWT Token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Return authentication packet to frontend localStorage hooks
        res.status(200).json({
            token,
            role: user.role,
            name: user.name
        });

    } catch (error) {
        console.error("Login Exception Logged:", error);
        res.status(500).json({ error: "Internal server processing failure during authentication." });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        // Check if user exists (but don't reveal this to the client)
        const user = await prisma.user.findUnique({ where: { email } });

        // Always return 200 for security — don't reveal if email exists
        // In a real system you would send an email here
        console.log(`Password reset requested for: ${email}, exists: ${!!user}`);

        res.status(200).json({ message: "If this email exists, a reset link has been sent." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: "Failed to process request." });
    }
};