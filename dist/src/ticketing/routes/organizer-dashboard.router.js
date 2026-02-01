"use strict";
/**
 * Organizer Dashboard Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizer_dashboard_controller_1 = require("../controllers/organizer-dashboard.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
// TODO: Add organizer ownership check middleware
router.get('/:id/stats', auth_middleware_1.authMiddleware, organizer_dashboard_controller_1.OrganizerDashboardController.getStats);
router.get('/:id/sales', auth_middleware_1.authMiddleware, organizer_dashboard_controller_1.OrganizerDashboardController.getSales);
router.get('/:id/validated-tickets', auth_middleware_1.authMiddleware, organizer_dashboard_controller_1.OrganizerDashboardController.getValidatedTickets);
router.get('/:id/revenue', auth_middleware_1.authMiddleware, organizer_dashboard_controller_1.OrganizerDashboardController.getRevenue);
exports.default = router;
