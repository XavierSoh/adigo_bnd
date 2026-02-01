/**
 * Admin Role Middleware
 *
 * Verifies that authenticated user has admin privileges
 * MUST be used after authMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { I18n } from '../utils/i18n';

/**
 * Check if user has admin role
 */
export const adminRoleMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
    

        const lang = req.lang || 'en';
        const userRole = req.userRole;

        if (!userRole) {
            res.status(401).json({
                status: false,
                message: I18n.t('unauthorized', lang),
                code: 401
            });
            return;
        }

        // Allow admin and super_admin roles
        const allowedRoles = ['admin', 'super_admin'];

        if (!allowedRoles.includes(userRole.toLowerCase())) {
            res.status(403).json({
                status: false,
                message: I18n.t('forbidden_admin_only', lang),
                code: 403
            });
            return;
        }

        next();
    } catch (error) {
        const lang = req.lang || 'en';
        console.error('Error in adminRoleMiddleware:', error);
        res.status(500).json({
            status: false,
            message: I18n.t('server_error', lang),
            code: 500
        });
    }
};

/**
 * Check if user has super_admin role
 */
export const superAdminRoleMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const lang = req.lang || 'en';
        const userRole = req.userRole;

        if (!userRole) {
            res.status(401).json({
                status: false,
                message: I18n.t('unauthorized', lang),
                code: 401
            });
            return;
        }

        if (userRole.toLowerCase() !== 'super_admin') {
            res.status(403).json({
                status: false,
                message: I18n.t('forbidden_super_admin_only', lang),
                code: 403
            });
            return;
        }

        next();
    } catch (error) {
        const lang = req.lang || 'en';
        console.error('Error in superAdminRoleMiddleware:', error);
        res.status(500).json({
            status: false,
            message: I18n.t('server_error', lang),
            code: 500
        });
    }
};
