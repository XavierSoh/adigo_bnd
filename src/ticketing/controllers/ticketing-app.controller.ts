/**
 * Routes de l'app mobile pour l'espace organisateur, le mode contrôleur et
 * le scan (TICKETING_MODULE_PLAN_2026-10.md §5.3). Toutes authentifiées
 * avec un token CLIENT : `req.userId` est l'id du compte client.
 */
import { Request, Response } from "express";
import prismaDb from "../../config/prismaClient";
import { TicketingAccess } from "../services/ticketing-access.service";
import { EventControllerService } from "../services/event-controller.service";
import { EventStatsService } from "../services/event-stats.service";
import { TicketScanService } from "../services/ticket-scan.service";
import { hasEnded, isScanWindowOpen } from "../utils/ticketing-rules";

function send(res: Response, code: number, message: string, body?: unknown) {
    res.status(code).json({ status: code < 400, message, ...(body !== undefined ? { body } : {}), code });
}

function idParam(req: Request, name: string): number {
    return parseInt((req.params as Record<string, string>)[name], 10);
}

const organizerEventSelect = {
    id: true, code: true, title: true, event_date: true, event_end_date: true, venue_name: true, city: true,
    cover_image: true, status: true, sales_paused: true,
} as const;

async function requireOrganizer(req: Request, res: Response) {
    const organizer = await TicketingAccess.organizerOfCustomer(req.userId);
    if (!organizer) {
        send(res, 403, 'Ce compte n\'est lié à aucun organisateur');
        return null;
    }
    return organizer;
}

export class TicketingAppController {

    /** Ce que l'app doit afficher : espace organisateur, mode contrôleur, badge d'invitations. */
    static async myRoles(req: Request, res: Response) {
        try {
            const customerId = req.userId!;
            const [organizer, pending, scannable] = await Promise.all([
                TicketingAccess.organizerOfCustomer(customerId),
                EventControllerService.pendingInvitations(customerId),
                EventControllerService.scannableEvents(customerId),
            ]);
            send(res, 200, 'Rôles billetterie', {
                organizer,
                pending_invitations: pending.length,
                controller_events: scannable.filter((e) => e.role === 'controller').length,
                scannable_events: scannable.length,
            });
        } catch (error) {
            console.error('myRoles error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    // ─── Espace organisateur (lecture seule) ─────────────────────────

    static async organizerEvents(req: Request, res: Response) {
        try {
            const organizer = await requireOrganizer(req, res);
            if (!organizer) return;
            const events = await prismaDb.event.findMany({
                where: { organizer_id: organizer.id, is_deleted: false, status: { not: 'draft' } },
                select: organizerEventSelect,
                orderBy: { event_date: 'desc' },
            });
            const summaries = await EventStatsService.summarizeEvents(events.map((e) => e.id));
            send(res, 200, 'Événements de l\'organisateur', {
                organizer,
                events: events.map((e) => ({ ...e, has_ended: hasEnded(e), stats: summaries.get(e.id) })),
            });
        } catch (error) {
            console.error('organizerEvents error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static async organizerEventDetail(req: Request, res: Response) {
        try {
            const organizer = await requireOrganizer(req, res);
            if (!organizer) return;
            const eventId = idParam(req, 'eventId');
            const event = await prismaDb.event.findFirst({
                where: { id: eventId, organizer_id: organizer.id, is_deleted: false, status: { not: 'draft' } },
                select: { ...organizerEventSelect, cancellation_reason: true },
            });
            if (!event) return send(res, 404, 'Événement introuvable');
            const [stats, controllers] = await Promise.all([
                EventStatsService.eventDetail(eventId),
                EventControllerService.listForEvent(eventId),
            ]);
            send(res, 200, 'Détail de l\'événement', {
                ...event,
                has_ended: hasEnded(event),
                can_scan_now: event.status === 'published' && isScanWindowOpen(event),
                stats,
                controllers,
            });
        } catch (error) {
            console.error('organizerEventDetail error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static async organizerBalance(req: Request, res: Response) {
        try {
            const organizer = await requireOrganizer(req, res);
            if (!organizer) return;
            const balance = await EventStatsService.organizerBalance(organizer.id);
            // Seuls les événements visibles de l'organisateur (pas ses brouillons).
            balance.events = balance.events.filter((e) => e.status !== 'draft');
            send(res, 200, 'Solde de l\'organisateur', { organizer, ...balance });
        } catch (error) {
            console.error('organizerBalance error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static async organizerControllers(req: Request, res: Response) {
        try {
            const eventId = idParam(req, 'eventId');
            if (!(await TicketingAccess.ownsEvent(req.userId, eventId))) return send(res, 404, 'Événement introuvable');
            send(res, 200, 'Contrôleurs', await EventControllerService.listForEvent(eventId));
        } catch (error) {
            console.error('organizerControllers error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static async organizerInvite(req: Request, res: Response) {
        try {
            const eventId = idParam(req, 'eventId');
            if (!(await TicketingAccess.ownsEvent(req.userId, eventId))) return send(res, 404, 'Événement introuvable');
            const { phone, email } = req.body as { phone?: string; email?: string };
            const result = await EventControllerService.invite(eventId, { phone, email }, { customerId: req.userId });
            if (result.ok === false) return send(res, result.code, result.message);
            send(res, 201, 'Invitation envoyée', result.body);
        } catch (error) {
            console.error('organizerInvite error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static async organizerRevoke(req: Request, res: Response) {
        try {
            const eventId = idParam(req, 'eventId');
            if (!(await TicketingAccess.ownsEvent(req.userId, eventId))) return send(res, 404, 'Événement introuvable');
            const result = await EventControllerService.revoke(eventId, idParam(req, 'controllerId'));
            if (result.ok === false) return send(res, result.code, result.message);
            send(res, 200, 'Accès révoqué', result.body);
        } catch (error) {
            console.error('organizerRevoke error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    // ─── Mode contrôleur ─────────────────────────────────────────────

    static async myInvitations(req: Request, res: Response) {
        try {
            send(res, 200, 'Invitations en attente', await EventControllerService.pendingInvitations(req.userId!));
        } catch (error) {
            console.error('myInvitations error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static respondInvitation(accept: boolean) {
        return async (req: Request, res: Response) => {
            try {
                const result = await EventControllerService.respond(idParam(req, 'id'), req.userId!, accept);
                if (result.ok === false) return send(res, result.code, result.message);
                send(res, 200, accept ? 'Invitation acceptée' : 'Invitation refusée', result.body);
            } catch (error) {
                console.error('respondInvitation error:', error);
                send(res, 500, 'Erreur serveur');
            }
        };
    }

    static async scannableEvents(req: Request, res: Response) {
        try {
            send(res, 200, 'Événements à contrôler', await EventControllerService.scannableEvents(req.userId!));
        } catch (error) {
            console.error('scannableEvents error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    // ─── Scan ────────────────────────────────────────────────────────

    private static async canScan(req: Request, eventId: number): Promise<boolean> {
        if (req.userRole) return true; // token staff/admin
        return TicketingAccess.canScanEvent(req.userId, eventId);
    }

    static async scanLookup(req: Request, res: Response) {
        try {
            const { event_id, qr_code } = req.body as { event_id?: number; qr_code?: string };
            const eventId = Number(event_id);
            if (!eventId || !qr_code) return send(res, 400, 'event_id et qr_code sont requis');
            if (!(await TicketingAppController.canScan(req, eventId))) return send(res, 403, 'Vous n\'êtes pas contrôleur de cet événement');
            send(res, 200, 'Résultat du scan', await TicketScanService.lookup(eventId, qr_code));
        } catch (error) {
            console.error('scanLookup error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }

    static async scanAdmit(req: Request, res: Response) {
        try {
            const { event_id, qr_code, count } = req.body as { event_id?: number; qr_code?: string; count?: number };
            const eventId = Number(event_id);
            if (!eventId || !qr_code) return send(res, 400, 'event_id et qr_code sont requis');
            if (!(await TicketingAppController.canScan(req, eventId))) return send(res, 403, 'Vous n\'êtes pas contrôleur de cet événement');
            const result = await TicketScanService.admit(eventId, qr_code, Number(count ?? 1), req.userRole
                ? { userId: req.userId }
                : { customerId: req.userId });
            send(res, result.ok ? 200 : 400, result.message, result);
        } catch (error) {
            console.error('scanAdmit error:', error);
            send(res, 500, 'Erreur serveur');
        }
    }
}
