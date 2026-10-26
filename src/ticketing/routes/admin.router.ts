/**
 * Ticketing admin router — mounted under the live "simple" ticketing router
 * at /v1/api/ticketing/admin/* and /v1/api/ticketing/organizer/*.
 *
 * Everything here requires staff auth + admin role (adminRoleMiddleware).
 *
 * Billetterie opérée par Adigo (TICKETING_MODULE_PLAN_2026-10.md) : les
 * routes de gestion (organisateurs, événements, types de billet, suivi,
 * contrôleurs, annulations, reversements, commission, images) s'ajoutent
 * aux routes historiques du tableau de bord, des transactions, de la
 * modération et des rapports. Les routes fixes (`/events/stats`,
 * `/organizers/pending`…) sont déclarées AVANT leurs voisines `/:id`.
 */
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
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
import { AdminManagementController as M } from '../controllers/admin-management.controller';
import { uploadEventPoster, uploadOrganizerLogo } from '../middleware/upload.event.middleware';

/** multer renvoie ses erreurs (type, taille) en JSON plutôt qu'en page HTML 500. */
function singleImage(uploader: multer.Multer) {
    return (req: Request, res: Response, next: NextFunction) => {
        uploader.single('image')(req, res, (err: unknown) => {
            if (err) {
                const message = err instanceof Error ? err.message : 'Image refusée';
                res.status(400).json({ status: false, message, code: 400 });
                return;
            }
            next();
        });
    };
}

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
// Fiche organisateur liée au compte client (carte « Profil organisateur »
// de la fiche utilisateur d'adigo2) — body null si aucune.
adminTicketingRouter.get('/users/:id/organizer-profile', M.organizerProfileOfCustomer);
adminTicketingRouter.get('/users/:id', AdminUsersController.getUserById);
adminTicketingRouter.patch('/users/:id/status', AdminUsersController.updateUserStatus);
adminTicketingRouter.get('/users', AdminUsersController.getAllUsers);

// Images (logo organisateur, affiche d'événement) — renvoient le chemin à
// enregistrer ensuite dans la fiche (`/uploads/...`).
adminTicketingRouter.post('/uploads/event-image', singleImage(uploadEventPoster), M.uploadedImage('events/posters'));
adminTicketingRouter.post('/uploads/organizer-logo', singleImage(uploadOrganizerLogo), M.uploadedImage('organizers'));

// Organisateurs — la file de vérification historique reste disponible.
adminTicketingRouter.get('/organizers/pending', EventValidationController.getPendingOrganizers);
adminTicketingRouter.post('/organizers/:id/verify', EventValidationController.verifyOrganizer);
adminTicketingRouter.get('/organizers', M.listOrganizers);
adminTicketingRouter.post('/organizers', M.createOrganizer);
adminTicketingRouter.get('/organizers/:id', M.organizerDetail);
adminTicketingRouter.put('/organizers/:id', M.updateOrganizer);
adminTicketingRouter.delete('/organizers/:id', M.deleteOrganizer);
adminTicketingRouter.post('/organizers/:id/payouts', M.recordPayout);

// Reversements
adminTicketingRouter.get('/payouts/balances', M.balances);
adminTicketingRouter.get('/payouts', M.listPayouts);
adminTicketingRouter.delete('/payouts/:id', M.deletePayout);

// Événements — validation historique d'abord (routes fixes), puis gestion.
adminTicketingRouter.get('/events/stats', EventValidationController.getEventsStats);
adminTicketingRouter.get('/events/pending', EventValidationController.getPendingEvents);
adminTicketingRouter.post('/events/:id/approve', M.publishEvent);
adminTicketingRouter.post('/events/:id/reject', EventValidationController.rejectEvent);
adminTicketingRouter.get('/events', M.listEvents);
adminTicketingRouter.post('/events', M.createEvent);
adminTicketingRouter.get('/events/:id', M.eventDetail);
adminTicketingRouter.put('/events/:id', M.updateEvent);
adminTicketingRouter.delete('/events/:id', M.deleteEvent);
adminTicketingRouter.post('/events/:id/publish', M.publishEvent);
adminTicketingRouter.post('/events/:id/pause', M.pauseEvent);
adminTicketingRouter.post('/events/:id/resume', M.resumeEvent);
adminTicketingRouter.post('/events/:id/cancel', M.cancelEvent);
adminTicketingRouter.post('/events/:id/ticket-types', M.addTicketType);
adminTicketingRouter.get('/events/:id/tickets/export', M.exportEventTickets);
adminTicketingRouter.get('/events/:id/tickets', M.eventTickets);
adminTicketingRouter.get('/events/:id/controllers', M.eventControllers);
adminTicketingRouter.post('/events/:id/controllers', M.inviteController);
adminTicketingRouter.delete('/events/:id/controllers/:controllerId', M.revokeController);

// Types de billet
adminTicketingRouter.put('/ticket-types/:typeId', M.updateTicketType);
adminTicketingRouter.delete('/ticket-types/:typeId', M.deleteTicketType);

// Demandes d'annulation de billet (le client demande, l'admin décide)
adminTicketingRouter.get('/cancellation-requests', M.cancellationRequests);
adminTicketingRouter.post('/tickets/:id/cancellation/approve', M.approveCancellation);
adminTicketingRouter.post('/tickets/:id/cancellation/reject', M.rejectCancellation);

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

// Settings — /settings/commission avant /settings/:key.
adminTicketingRouter.get('/settings/commission', M.getCommission);
adminTicketingRouter.put('/settings/commission', M.updateCommission);
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

// Tableau de bord par organisateur (historique) — réservé aux admins : il
// expose les acheteurs (nom, email) et n'avait aucun contrôle de
// propriétaire. L'organisateur passe par /organizer-space (app mobile).
export const organizerDashboardRouter = Router();
organizerDashboardRouter.use(authMiddleware, adminRoleMiddleware);
organizerDashboardRouter.get('/:id/stats', OrganizerDashboardController.getStats);
organizerDashboardRouter.get('/:id/sales', OrganizerDashboardController.getSales);
organizerDashboardRouter.get('/:id/validated-tickets', OrganizerDashboardController.getValidatedTickets);
organizerDashboardRouter.get('/:id/revenue', OrganizerDashboardController.getRevenue);

export default adminTicketingRouter;
