"use strict";
/**
 * Admin Role Middleware
 *
 * Verifies that authenticated user has admin privileges
 * MUST be used after authMiddleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminRoleMiddleware = exports.adminRoleMiddleware = void 0;
const i18n_1 = require("../utils/i18n");
/**
 * Check if user has admin role
 */
const adminRoleMiddleware = (req, res, next) => {
    try {
        const lang = req.lang || 'en';
        const userRole = req.userRole;
        if (!userRole) {
            res.status(401).json({
                status: false,
                message: i18n_1.I18n.t('unauthorized', lang),
                code: 401
            });
            return;
        }
        // Allow admin and super_admin roles
        const allowedRoles = ['admin', 'super_admin'];
        if (!allowedRoles.includes(userRole.toLowerCase())) {
            res.status(403).json({
                status: false,
                message: i18n_1.I18n.t('forbidden_admin_only', lang),
                code: 403
            });
            return;
        }
        next();
    }
    catch (error) {
        const lang = req.lang || 'en';
        console.error('Error in adminRoleMiddleware:', error);
        res.status(500).json({
            status: false,
            message: i18n_1.I18n.t('server_error', lang),
            code: 500
        });
    }
};
exports.adminRoleMiddleware = adminRoleMiddleware;
/**
 * Check if user has super_admin role
 */
const superAdminRoleMiddleware = (req, res, next) => {
    try {
        const lang = req.lang || 'en';
        const userRole = req.userRole;
        if (!userRole) {
            res.status(401).json({
                status: false,
                message: i18n_1.I18n.t('unauthorized', lang),
                code: 401
            });
            return;
        }
        if (userRole.toLowerCase() !== 'super_admin') {
            res.status(403).json({
                status: false,
                message: i18n_1.I18n.t('forbidden_super_admin_only', lang),
                code: 403
            });
            return;
        }
        next();
    }
    catch (error) {
        const lang = req.lang || 'en';
        console.error('Error in superAdminRoleMiddleware:', error);
        res.status(500).json({
            status: false,
            message: i18n_1.I18n.t('server_error', lang),
            code: 500
        });
    }
};
exports.superAdminRoleMiddleware = superAdminRoleMiddleware;
