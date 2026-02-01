"use strict";
/**
 * Ticketing Module Routes
 *
 * Main router that aggregates all ticketing-related endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_router_1 = __importDefault(require("../ticketing/routes/event.router"));
const event_category_router_1 = __importDefault(require("../ticketing/routes/event-category.router"));
const event_organizer_router_1 = __importDefault(require("../ticketing/routes/event-organizer.router"));
const event_ticket_purchase_router_1 = __importDefault(require("../ticketing/routes/event-ticket-purchase.router"));
const event_favorite_router_1 = __importDefault(require("../ticketing/routes/event-favorite.router"));
const event_review_router_1 = __importDefault(require("../ticketing/routes/event-review.router"));
const event_ticket_resale_router_1 = __importDefault(require("../ticketing/routes/event-ticket-resale.router"));
const event_validation_router_1 = __importDefault(require("../ticketing/routes/event-validation.router"));
const organizer_dashboard_router_1 = __importDefault(require("../ticketing/routes/organizer-dashboard.router"));
// Admin routes - Phase 1
const admin_users_router_1 = __importDefault(require("../ticketing/routes/admin-users.router"));
const admin_analytics_router_1 = __importDefault(require("../ticketing/routes/admin-analytics.router"));
const admin_transactions_router_1 = __importDefault(require("../ticketing/routes/admin-transactions.router"));
const admin_reports_router_1 = __importDefault(require("../ticketing/routes/admin-reports.router"));
// Admin routes - Phase 2
const admin_reviews_router_1 = __importDefault(require("../ticketing/routes/admin-reviews.router"));
const admin_resales_router_1 = __importDefault(require("../ticketing/routes/admin-resales.router"));
const admin_promo_router_1 = __importDefault(require("../ticketing/routes/admin-promo.router"));
const admin_settings_router_1 = __importDefault(require("../ticketing/routes/admin-settings.router"));
const admin_logs_router_1 = __importDefault(require("../ticketing/routes/admin-logs.router"));
const ticketingRouter = (0, express_1.Router)();
// Event Management
ticketingRouter.use('/events', event_router_1.default);
ticketingRouter.use('/categories', event_category_router_1.default);
ticketingRouter.use('/organizers', event_organizer_router_1.default);
// Ticket Purchase & Management
ticketingRouter.use('/tickets', event_ticket_purchase_router_1.default);
// User Interactions
ticketingRouter.use('/favorites', event_favorite_router_1.default);
ticketingRouter.use('/reviews', event_review_router_1.default);
// Ticket Marketplace
ticketingRouter.use('/resale', event_ticket_resale_router_1.default);
// Admin - Event Validation
ticketingRouter.use('/admin', event_validation_router_1.default);
// Admin - User Management (NEW)
ticketingRouter.use('/admin/users', admin_users_router_1.default);
// Admin - Analytics & Dashboard (NEW)
ticketingRouter.use('/admin/analytics', admin_analytics_router_1.default);
// Admin - Transactions Management (NEW)
ticketingRouter.use('/admin/transactions', admin_transactions_router_1.default);
// Admin - Reports & Exports
ticketingRouter.use('/admin/reports', admin_reports_router_1.default);
// Admin - Phase 2: Reviews Moderation
ticketingRouter.use('/admin/reviews', admin_reviews_router_1.default);
// Admin - Phase 2: Resales Moderation
ticketingRouter.use('/admin/resales', admin_resales_router_1.default);
// Admin - Phase 2: Promo Codes
ticketingRouter.use('/admin/promo-codes', admin_promo_router_1.default);
// Admin - Phase 2: Settings (Super Admin only)
ticketingRouter.use('/admin/settings', admin_settings_router_1.default);
// Admin - Phase 2: Logs & Audit
ticketingRouter.use('/admin/logs', admin_logs_router_1.default);
// Organizer Dashboard
ticketingRouter.use('/organizer', organizer_dashboard_router_1.default);
exports.default = ticketingRouter;
