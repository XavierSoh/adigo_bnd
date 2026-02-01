"use strict";
/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and attaches user info to request
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'adigo_secret_key_2025';
/**
 * Verify JWT token from Authorization header
 */
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                status: false,
                message: 'No authorization token provided',
                code: 401
            });
            return;
        }
        // Extract token (format: "Bearer <token>")
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;
        if (!token) {
            res.status(401).json({
                status: false,
                message: 'Invalid authorization format',
                code: 401
            });
            return;
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Attach user info to request
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                status: false,
                message: 'Token expired',
                code: 401
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                status: false,
                message: 'Invalid token',
                code: 401
            });
            return;
        }
        res.status(500).json({
            status: false,
            message: 'Authentication error',
            code: 500
        });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            next();
            return;
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.userId = decoded.id;
            req.userEmail = decoded.email;
            req.userRole = decoded.role;
        }
        next();
    }
    catch (error) {
        // Silently continue without auth
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
