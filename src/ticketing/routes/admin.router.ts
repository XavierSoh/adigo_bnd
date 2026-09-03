/**
 * Ticketing admin router — the fixed subset of the "rich" ticketing
 * module's admin surface, mounted under the live "simple" ticketing router
 * at /v1/api/ticketing/admin/* and /v1/api/ticketing/organizer/*. See
 * BOOKING_MODULE_NOTES.md ("Ticketing admin surface rebuild") for why only
 * these 10 routers are wired here and not the rich module's own duplicate
 * /events, /categories, /organizers, /tickets, /favorites, /reviews,
 * /resale sub-routers (those stay unmounted — the simple module already
 * serves that CRUD correctly).
 *
 * Everything under /admin requires staff auth + admin role — the original
 * rich module mounted these with NO auth at all (pre-existing gap, not
 * introduced here); adminRoleMiddleware was already sitting unused in
 * src/middleware, built for exactly this.
 * /organizer/:id/* is organizer-facing (an organizer viewing their own
 * dashboard), not desktop-admin — gated by auth only, no role check.
 */
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';
import { AdminAnalyticsController } from '../controllers/admin-analytics.controller';
import { AdminLogsController } from '../controllers/admin-logs.controller';
import { AdminPromoController } from '../controllers/admin-promo.controller';
import { AdminReportsController } from '../controllers/admin-reports.controller';
import { AdminResalesController } from '../controllers/admin-resales.controller';
import { AdminReviewsController } from '../controllers/admin-reviews.controller';
import { AdminSettingsController } from '../controllers/admin-settings.controller';
import { AdminTransactionsController } from '../controllers/admin-transactions.controller';
import { AdminUsersController } from '../controllers/admin-users.controller';
import { EventValidationController } from '../controllers/event-validation.controller';
import { OrganizerDashboardController } from '../controllers/organizer-dashboard.controller';

const adminTicketingRouter = Router();
adminTicketingRouter.use(authMiddleware, adminRoleMiddleware);

// Analytics / dashboard
adminTicketingRouter.get('/analytics/dashboard', AdminAnalyticsController.getDashboard);
adminTicketingRouter.get('/analytics/sales-trends', AdminAnalyticsController.getSalesTrends);
adminTicketingRouter.get('/analytics/top-organizers', AdminAnalyticsController.getTopOrganizers);
adminTicketingRouter.get('/analytics/top-events', AdminAnalyticsController.getTopEvents);
adminTicketingRouter.get('/analytics/revenue-breakdown', AdminAnalyticsController.getRevenueBreakdown);

// Users
adminTicketingRouter.get('/users/search', AdminUsersController.searchUsers);
adminTicketingRouter.get('/users/:id/transactions', AdminUsersController.getUserTransactions);
adminTicketingRouter.get('/users/:id/tickets', AdminUsersController.getUserTickets);
adminTicketingRouter.get('/users/:id/wallet', AdminUsersController.getUserWallet);
adminTicketingRouter.get('/users/:id', AdminUsersController.getUserById);
adminTicketingRouter.patch('/users/:id/status', AdminUsersController.updateUserStatus);
adminTicketingRouter.get('/users', AdminUsersController.getAllUsers);

// Organizer validation (event-validation.controller.ts also owns
// /events/pending and /events/:id/approve|reject below)
adminTicketingRouter.get('/organizers/pending', EventValidationController.getPendingOrganizers);
adminTicketingRouter.post('/organizers/:id/verify', EventValidationController.verifyOrganizer);

// Event validation
adminTicketingRouter.get('/events/stats', EventValidationController.getEventsStats);
adminTicketingRouter.get('/events/pending', EventValidationController.getPendingEvents);
adminTicketingRouter.post('/events/:id/approve', EventValidationController.approveEvent);
adminTicketingRouter.post('/events/:id/reject', EventValidationController.rejectEvent);

// Transactions
adminTicketingRouter.get('/transactions/wallet', AdminTransactionsController.getWalletTransactions);
adminTicketingRouter.get('/transactions/tickets', AdminTransactionsController.getTicketTransactions);
adminTicketingRouter.get('/transactions/premium', AdminTransactionsController.getPremiumTransactions);
adminTicketingRouter.post('/transactions/:id/refund', AdminTransactionsController.processRefund);
adminTicketingRouter.get('/transactions/:id', AdminTransactionsController.getTransactionById);

// Reviews moderation
adminTicketingRouter.get('/reviews/flagged', AdminReviewsController.getFlaggedReviews);
adminTicketingRouter.get('/reviews/stats', AdminReviewsController.getReviewStats);
adminTicketingRouter.get('/reviews', AdminReviewsController.getAllReviews);
adminTicketingRouter.post('/reviews/:id/flag', AdminReviewsController.flagReview);
adminTicketingRouter.post('/reviews/:id/unflag', AdminReviewsController.unflagReview);
adminTicketingRouter.delete('/reviews/:id', AdminReviewsController.deleteReview);

// Resales moderation
adminTicketingRouter.get('/resales/stats', AdminResalesController.getResaleStats);
adminTicketingRouter.get('/resales', AdminResalesController.getAllResales);
adminTicketingRouter.post('/resales/:id/approve', AdminResalesController.approveResale);
adminTicketingRouter.post('/resales/:id/reject', AdminResalesController.rejectResale);
adminTicketingRouter.delete('/resales/:id', AdminResalesController.deleteResale);

// Promo codes
adminTicketingRouter.get('/promo-codes/stats', AdminPromoController.getPromoStats);
adminTicketingRouter.get('/promo-codes', AdminPromoController.getAllPromoCodes);
adminTicketingRouter.post('/promo-codes', AdminPromoController.createPromoCode);
adminTicketingRouter.put('/promo-codes/:id', AdminPromoController.updatePromoCode);
adminTicketingRouter.delete('/promo-codes/:id', AdminPromoController.deletePromoCode);

// Settings
adminTicketingRouter.get('/settings/pricing', AdminSettingsController.getPricing);
adminTicketingRouter.put('/settings/pricing', AdminSettingsController.updatePricing);
adminTicketingRouter.get('/settings', AdminSettingsController.getSettings);
adminTicketingRouter.put('/settings/:key', AdminSettingsController.updateSetting);

// Reports & exports
adminTicketingRouter.get('/reports/users/export', AdminReportsController.exportUsers);
adminTicketingRouter.get('/reports/events/export', AdminReportsController.exportEvents);
adminTicketingRouter.get('/reports/tickets/export', AdminReportsController.exportTickets);
adminTicketingRouter.get('/reports/transactions/export', AdminReportsController.exportTransactions);
adminTicketingRouter.get('/reports/revenue', AdminReportsController.getRevenueReport);

// Logs & audit
adminTicketingRouter.get('/logs/activity', AdminLogsController.getActivityLogs);
adminTicketingRouter.get('/logs/login', AdminLogsController.getLoginLogs);
adminTicketingRouter.get('/logs/audit/:entityType/:entityId', AdminLogsController.getAuditTrail);

export const organizerDashboardRouter = Router();
organizerDashboardRouter.use(authMiddleware);
organizerDashboardRouter.get('/:id/stats', OrganizerDashboardController.getStats);
organizerDashboardRouter.get('/:id/sales', OrganizerDashboardController.getSales);
organizerDashboardRouter.get('/:id/validated-tickets', OrganizerDashboardController.getValidatedTickets);
organizerDashboardRouter.get('/:id/revenue', OrganizerDashboardController.getRevenue);

export default adminTicketingRouter;
