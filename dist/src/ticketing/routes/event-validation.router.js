"use strict";
/**
 * Event Validation Routes (Admin)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_validation_controller_1 = require("../controllers/event-validation.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Events validation
router.get('/events/pending', event_validation_controller_1.EventValidationController.getPendingEvents);
router.post('/events/:id/approve', event_validation_controller_1.EventValidationController.approveEvent);
router.post('/events/:id/reject', event_validation_controller_1.EventValidationController.rejectEvent);
router.get('/events/stats', event_validation_controller_1.EventValidationController.getEventsStats);
// Organizers verification
router.get('/organizers/pending', event_validation_controller_1.EventValidationController.getPendingOrganizers);
router.post('/organizers/:id/verify', event_validation_controller_1.EventValidationController.verifyOrganizer);
exports.default = router;
