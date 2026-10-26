import { NextFunction, Request, Response, Router } from "express";
import {
    CategoryController,
    OrganizerController,
    EventController,
    TicketController,
    FavoriteController,
    ReviewController
} from "../../controllers/ticketing";
import adminTicketingRouter, { organizerDashboardRouter } from "../../ticketing/routes/admin.router";
import { TicketingAppController as App } from "../../ticketing/controllers/ticketing-app.controller";
import { AdminManagementController as M } from "../../ticketing/controllers/admin-management.controller";
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware";
import { adminRoleMiddleware } from "../../middleware/admin-role.middleware";
import { localizeTicketingMessages } from "../../ticketing/utils/message-i18n";

/**
 * Billetterie opérée par Adigo (TICKETING_MODULE_PLAN_2026-10.md) :
 * - lecture publique : catégories, événements PUBLIÉS, types de billet, avis ;
 * - toute écriture sur le catalogue (événements, types, organisateurs,
 *   catégories) est réservée aux admins — c'est Adigo qui crée et vend ;
 * - les routes client lisent l'identité dans le token, jamais dans le corps
 *   de la requête ;
 * - espace organisateur, mode contrôleur et scan : routes client dédiées.
 */
const ticketingRouter = Router();
const admin = [authMiddleware, adminRoleMiddleware];

// Messages en anglais quand l'app le demande explicitement (voir message-i18n.ts).
ticketingRouter.use(localizeTicketingMessages);

/**
 * Routes réservées aux comptes CLIENTS : elles lisent `req.userId` comme un
 * id client. Un token staff porte un id de la table `users` — sans ce
 * garde, il serait confondu avec le client de même numéro.
 */
function customerOnly(req: Request, res: Response, next: NextFunction) {
    if (req.userRole) {
        res.status(403).json({ status: false, message: "Réservé aux comptes clients", code: 403 });
        return;
    }
    next();
}
const customer = [authMiddleware, customerOnly];

// ============================================
// CATEGORIES
// ============================================
ticketingRouter.get("/categories", CategoryController.getAll);
ticketingRouter.get("/categories/:id", CategoryController.getById);
ticketingRouter.post("/categories", ...admin, CategoryController.create);
ticketingRouter.put("/categories/:id", ...admin, CategoryController.update);
ticketingRouter.delete("/categories/:id", ...admin, CategoryController.delete);

// ============================================
// ORGANIZERS (historique — la gestion passe par /admin/organizers)
// ============================================
ticketingRouter.get("/organizers", ...admin, OrganizerController.getAll);
ticketingRouter.get("/organizers/customer/:customerId", ...admin, OrganizerController.getByCustomerId);
ticketingRouter.get("/organizers/:id", ...admin, OrganizerController.getById);
ticketingRouter.post("/organizers", ...admin, M.createOrganizer);
ticketingRouter.put("/organizers/:id", ...admin, M.updateOrganizer);
ticketingRouter.patch("/organizers/:id/verify", ...admin, OrganizerController.verify);
ticketingRouter.delete("/organizers/:id", ...admin, M.deleteOrganizer);

// ============================================
// EVENTS — lecture publique des seuls événements publiés
// ============================================
ticketingRouter.get("/events", EventController.getAll);
ticketingRouter.get("/events/search", EventController.search);
ticketingRouter.get("/events/code/:code", optionalAuthMiddleware, EventController.getByCode);
ticketingRouter.get("/events/:id", optionalAuthMiddleware, EventController.getById);
ticketingRouter.get("/events/:id/ticket-types", optionalAuthMiddleware, EventController.getTicketTypes);
ticketingRouter.post("/events", ...admin, M.createEvent);
ticketingRouter.put("/events/:id", ...admin, M.updateEvent);
ticketingRouter.patch("/events/:id/publish", ...admin, M.publishEvent);
ticketingRouter.patch("/events/:id/approve", ...admin, M.publishEvent);
ticketingRouter.patch("/events/:id/cancel", ...admin, M.cancelEvent);
ticketingRouter.delete("/events/:id", ...admin, M.deleteEvent);
ticketingRouter.post("/events/:id/ticket-types", ...admin, M.addTicketType);
ticketingRouter.put("/events/:id/ticket-types/:typeId", ...admin, M.updateTicketType);
ticketingRouter.delete("/events/:id/ticket-types/:typeId", ...admin, M.deleteTicketType);

// ============================================
// TICKETS (client)
// ============================================
ticketingRouter.get("/tickets/customer/:customerId", authMiddleware, TicketController.getMyTickets);
ticketingRouter.get("/tickets/ref/:reference", authMiddleware, TicketController.getByReference);
ticketingRouter.get("/tickets/:id", authMiddleware, TicketController.getById);
ticketingRouter.post("/tickets/purchase", authMiddleware, TicketController.purchase);
ticketingRouter.patch("/tickets/:id/cancel", authMiddleware, TicketController.cancel);
// Guichet / outils admin
ticketingRouter.patch("/tickets/:id/payment", ...admin, TicketController.confirmPayment);
ticketingRouter.patch("/tickets/:id/validate", ...admin, TicketController.validate);
ticketingRouter.post("/tickets/validate-qr", ...admin, TicketController.validateByQr);

// ============================================
// FAVORITES (client — identité lue dans le token)
// ============================================
ticketingRouter.get("/favorites/customer/:customerId", authMiddleware, FavoriteController.getMyFavorites);
ticketingRouter.get("/favorites/check/:eventId", ...customer, FavoriteController.check);
ticketingRouter.post("/favorites/:eventId/toggle", ...customer, FavoriteController.toggle);
ticketingRouter.post("/favorites/:eventId", ...customer, FavoriteController.add);
ticketingRouter.delete("/favorites/:eventId", ...customer, FavoriteController.remove);

// ============================================
// REVIEWS
// ============================================
ticketingRouter.get("/reviews/event/:eventId", ReviewController.getByEventId);
ticketingRouter.get("/reviews/event/:eventId/stats", ReviewController.getEventStats);
ticketingRouter.post("/reviews", ...customer, ReviewController.create);
ticketingRouter.put("/reviews/:id", ...customer, ReviewController.update);
ticketingRouter.delete("/reviews/:id", ...customer, ReviewController.delete);
ticketingRouter.patch("/reviews/:id/approve", ...admin, ReviewController.approve);

// ============================================
// APP : rôles, espace organisateur, mode contrôleur, scan
// ============================================
ticketingRouter.get("/me/roles", ...customer, App.myRoles);

ticketingRouter.get("/organizer-space/events", ...customer, App.organizerEvents);
ticketingRouter.get("/organizer-space/events/:eventId", ...customer, App.organizerEventDetail);
ticketingRouter.get("/organizer-space/balance", ...customer, App.organizerBalance);
ticketingRouter.get("/organizer-space/events/:eventId/controllers", ...customer, App.organizerControllers);
ticketingRouter.post("/organizer-space/events/:eventId/controllers", ...customer, App.organizerInvite);
ticketingRouter.delete("/organizer-space/events/:eventId/controllers/:controllerId", ...customer, App.organizerRevoke);

ticketingRouter.get("/controller/invitations", ...customer, App.myInvitations);
ticketingRouter.post("/controller/invitations/:id/accept", ...customer, App.respondInvitation(true));
ticketingRouter.post("/controller/invitations/:id/decline", ...customer, App.respondInvitation(false));
ticketingRouter.get("/controller/events", ...customer, App.scannableEvents);

ticketingRouter.post("/scan/lookup", authMiddleware, App.scanLookup);
ticketingRouter.post("/scan/admit", authMiddleware, App.scanAdmit);

// ============================================
// ADMIN SURFACE (desktop BILLETTERIE admin screens)
// ============================================
ticketingRouter.use("/admin", adminTicketingRouter);
ticketingRouter.use("/organizer", organizerDashboardRouter);

export default ticketingRouter;
