/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'adigo_secret_key_2025';

interface JWTPayload {
    id: number;
    email: string;
    role?: string;
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            userId?: number;
            userEmail?: string;
            userRole?: string;
        }
    }
}

/**
 * Verify JWT token from Authorization header
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

        // Attach user info to request
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                status: false,
                message: 'Token expired',
                code: 401
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
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

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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
            const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
            req.userId = decoded.id;
            req.userEmail = decoded.email;
            req.userRole = decoded.role;
        }

        next();
    } catch (error) {
        // Silently continue without auth
        next();
    }
};
