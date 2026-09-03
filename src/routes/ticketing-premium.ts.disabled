/**
 * Ticketing Module Routes
 *
 * Main router that aggregates all ticketing-related endpoints
 */

import { Router } from 'express';
import eventRouter from '../ticketing/routes/event.router';
import eventCategoryRouter from '../ticketing/routes/event-category.router';
import eventOrganizerRouter from '../ticketing/routes/event-organizer.router';
import eventTicketPurchaseRouter from '../ticketing/routes/event-ticket-purchase.router';
import eventFavoriteRouter from '../ticketing/routes/event-favorite.router';
import eventReviewRouter from '../ticketing/routes/event-review.router';
import eventTicketResaleRouter from '../ticketing/routes/event-ticket-resale.router';
import eventValidationRouter from '../ticketing/routes/event-validation.router';
import organizerDashboardRouter from '../ticketing/routes/organizer-dashboard.router';

// Admin routes - Phase 1
import adminUsersRouter from '../ticketing/routes/admin-users.router';
import adminAnalyticsRouter from '../ticketing/routes/admin-analytics.router';
import adminTransactionsRouter from '../ticketing/routes/admin-transactions.router';
import adminReportsRouter from '../ticketing/routes/admin-reports.router';

// Admin routes - Phase 2
import adminReviewsRouter from '../ticketing/routes/admin-reviews.router';
import adminResalesRouter from '../ticketing/routes/admin-resales.router';
import adminPromoRouter from '../ticketing/routes/admin-promo.router';
import adminSettingsRouter from '../ticketing/routes/admin-settings.router';
import adminLogsRouter from '../ticketing/routes/admin-logs.router';

const ticketingRouter = Router();

// Event Management
ticketingRouter.use('/events', eventRouter);
ticketingRouter.use('/categories', eventCategoryRouter);
ticketingRouter.use('/organizers', eventOrganizerRouter);

// Ticket Purchase & Management
ticketingRouter.use('/tickets', eventTicketPurchaseRouter);

// User Interactions
ticketingRouter.use('/favorites', eventFavoriteRouter);
ticketingRouter.use('/reviews', eventReviewRouter);

// Ticket Marketplace
ticketingRouter.use('/resale', eventTicketResaleRouter);

// Admin - Event Validation
ticketingRouter.use('/admin', eventValidationRouter);

// Admin - User Management (NEW)
ticketingRouter.use('/admin/users', adminUsersRouter);

// Admin - Analytics & Dashboard (NEW)
ticketingRouter.use('/admin/analytics', adminAnalyticsRouter);

// Admin - Transactions Management (NEW)
ticketingRouter.use('/admin/transactions', adminTransactionsRouter);

// Admin - Reports & Exports
ticketingRouter.use('/admin/reports', adminReportsRouter);

// Admin - Phase 2: Reviews Moderation
ticketingRouter.use('/admin/reviews', adminReviewsRouter);

// Admin - Phase 2: Resales Moderation
ticketingRouter.use('/admin/resales', adminResalesRouter);

// Admin - Phase 2: Promo Codes
ticketingRouter.use('/admin/promo-codes', adminPromoRouter);

// Admin - Phase 2: Settings (Super Admin only)
ticketingRouter.use('/admin/settings', adminSettingsRouter);

// Admin - Phase 2: Logs & Audit
ticketingRouter.use('/admin/logs', adminLogsRouter);

// Organizer Dashboard
ticketingRouter.use('/organizer', organizerDashboardRouter);

export default ticketingRouter;
