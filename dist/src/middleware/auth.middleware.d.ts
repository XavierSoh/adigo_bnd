/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and attaches user info to request
 */
import { Request, Response, NextFunction } from 'express';
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
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Optional authentication - doesn't fail if no token
 */
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => void;
