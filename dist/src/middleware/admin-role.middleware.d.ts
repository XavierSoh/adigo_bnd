/**
 * Admin Role Middleware
 *
 * Verifies that authenticated user has admin privileges
 * MUST be used after authMiddleware
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Check if user has admin role
 */
export declare const adminRoleMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Check if user has super_admin role
 */
export declare const superAdminRoleMiddleware: (req: Request, res: Response, next: NextFunction) => void;
