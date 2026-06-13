/**
 * EduSphere AI - Security Middleware Shell
 * Enforces JWT validation and structural Role-Based Access Control (RBAC).
 */

const jwt = require('jsonwebtoken');

/**
 * Core Middleware: Verifies if the incoming request has a valid JWT token.
 */
const verifyToken = (req, res, next) => {
    // 1. Extract the token from the HTTP Authorization Header
    const authHeader = req.headers['authorization'];
    
    // Tokens are typically sent as "Bearer <token_string>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access Denied: Missing authentication session token." });
    }

    try {
        // 2. Decrypt and validate the signature using your secret environment key
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the verified user payload (userId and role) directly to the request object
        req.user = verified;
        
        // Pass control smoothly to the next function block in the router path
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired session token profile configuration." });
    }
};

/**
 * Role Filter Middleware: Blocks users who do not have the required access permissions.
 * @param {...string} allowedRoles - Array of roles permitted to access the route (e.g., 'TEACHER', 'ADMIN')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if the user object exists and its role matches the allowed array values
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access Forbidden: Your account role (${req.user?.role || 'GUEST'}) lacks permission layout clearances.` 
            });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    authorizeRoles
};