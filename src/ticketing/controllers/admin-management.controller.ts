/**
 * Écrans de gestion de la billetterie dans adigo2 — organisateurs,
 * événements, types de billet, suivi, contrôleurs, demandes d'annulation,
 * reversements, commission (TICKETING_MODULE_PLAN_2026-10.md §5.1).
 * Monté sous /v1/api/ticketing/admin, derrière authMiddleware +
 * adminRoleMiddleware (admin.router.ts) : `req.userId` est l'id staff.
 */
import { Request, Response } from "express";
import { AdminEventsService } from "../services/admin-events.service";
import { AdminOrganizersService } from "../services/admin-organizers.service";
import { EventControllerService } from "../services/event-controller.service";
import { TicketCancellationService } from "../services/ticket-cancellation.service";
import { CommissionService } from "../services/commission.service";
import { ExportService } from "../services/export.service";

type Handler = (req: Request, res: Response) => Promise<void>;
type ServiceResult = { ok: true; body: unknown; message?: string } | { ok: false; code: number; message: string };

function send(res: Response, code: number, message: string, body?: unknown) {
    res.status(code).json({ status: code < 400, message, ...(body !== undefined ? { body } : {}), code });
}

function reply(res: Response, result: ServiceResult, successMessage: string, successCode = 200) {
    if (result.ok === false) return send(res, result.code, result.message);
    send(res, successCode, result.message ?? successMessage, result.body);
}

function idParam(req: Request, name = 'id'): number {
    return parseInt((req.params as Record<string, string>)[name], 10);
}

/** Toute exception non prévue devient un 500 propre, sans faire tomber la requête. */
function guarded(label: string, fn: Handler): Handler {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (error) {
            console.error(`AdminManagement.${label} error:`, error);
            if (!res.headersSent) send(res, 500, 'Erreur serveur');
        }
    };
}

const query = (req: Request) => req.query as Record<string, string | undefined>;

export const AdminManagementController = {

    // ─── Événements ──────────────────────────────────────────────────
    listEvents: guarded('listEvents', async (req, res) => {
        send(res, 200, 'Événements', await AdminEventsService.list(query(req)));
    }),
    eventDetail: guarded('eventDetail', async (req, res) => {
        reply(res, await AdminEventsService.detail(idParam(req)), 'Événement');
    }),
    createEvent: guarded('createEvent', async (req, res) => {
        reply(res, await AdminEventsService.create(req.body ?? {}, req.userId), 'Brouillon créé', 201);
    }),
    updateEvent: guarded('updateEvent', async (req, res) => {
        reply(res, await AdminEventsService.update(idParam(req), req.body ?? {}), 'Événement mis à jour');
    }),
    publishEvent: guarded('publishEvent', async (req, res) => {
        reply(res, await AdminEventsService.publish(idParam(req), req.userId), 'Événement publié');
    }),
    pauseEvent: guarded('pauseEvent', async (req, res) => {
        reply(res, await AdminEventsService.setSalesPaused(idParam(req), true, (req.body ?? {}).reason), 'Ventes suspendues');
    }),
    resumeEvent: guarded('resumeEvent', async (req, res) => {
        reply(res, await AdminEventsService.setSalesPaused(idParam(req), false), 'Ventes reprises');
    }),
    cancelEvent: guarded('cancelEvent', async (req, res) => {
        reply(res, await AdminEventsService.cancel(idParam(req), (req.body ?? {}).reason), 'Événement annulé');
    }),
    deleteEvent: guarded('deleteEvent', async (req, res) => {
        reply(res, await AdminEventsService.remove(idParam(req), req.userId), 'Brouillon supprimé');
    }),

    addTicketType: guarded('addTicketType', async (req, res) => {
        reply(res, await AdminEventsService.addTicketType(idParam(req), req.body ?? {}), 'Type de billet ajouté', 201);
    }),
    updateTicketType: guarded('updateTicketType', async (req, res) => {
        reply(res, await AdminEventsService.updateTicketType(idParam(req, 'typeId'), req.body ?? {}), 'Type de billet mis à jour');
    }),
    deleteTicketType: guarded('deleteTicketType', async (req, res) => {
        reply(res, await AdminEventsService.deleteTicketType(idParam(req, 'typeId')), 'Type de billet supprimé');
    }),

    eventTickets: guarded('eventTickets', async (req, res) => {
        send(res, 200, 'Billets', await AdminEventsService.tickets(idParam(req), query(req)));
    }),
    exportEventTickets: guarded('exportEventTickets', async (req, res) => {
        const { tickets } = await AdminEventsService.tickets(idParam(req), { ...query(req), limit: '1000' });
        const rows = tickets.map((t) => ({
            reference: t.reference,
            buyer: `${t.customer.first_name} ${t.customer.last_name}`.trim(),
            phone: t.customer.phone ?? '',
            email: t.customer.email ?? '',
            ticket_type: t.ticket_type.name,
            quantity: t.quantity,
            total_price: t.total_price,
            payment_method: t.payment_method ?? '',
            payment_status: t.payment_status ?? '',
            status: t.status ?? '',
            checked_in: `${t.checked_in_count}/${t.quantity}`,
            purchased_at: t.created_at ? t.created_at.toISOString() : '',
            last_scan_at: t.last_scan_at ? t.last_scan_at.toISOString() : '',
            last_scan_by: t.last_scan_by ?? '',
        }));
        const buffer = await ExportService.exportToExcel(rows, [
            { header: 'Référence', key: 'reference', width: 14 },
            { header: 'Acheteur', key: 'buyer', width: 26 },
            { header: 'Téléphone', key: 'phone', width: 16 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Type', key: 'ticket_type', width: 16 },
            { header: 'Qté', key: 'quantity', width: 6 },
            { header: 'Montant (XAF)', key: 'total_price', width: 14 },
            { header: 'Paiement', key: 'payment_method', width: 12 },
            { header: 'Statut paiement', key: 'payment_status', width: 14 },
            { header: 'Statut', key: 'status', width: 12 },
            { header: 'Entrées', key: 'checked_in', width: 9 },
            { header: 'Acheté le (UTC)', key: 'purchased_at', width: 24 },
            { header: 'Dernier scan (UTC)', key: 'last_scan_at', width: 24 },
            { header: 'Scanné par', key: 'last_scan_by', width: 22 },
        ], 'Billets');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="billets-evenement-${idParam(req)}.xlsx"`);
        res.send(buffer);
    }),

    // ─── Contrôleurs d'un événement ──────────────────────────────────
    eventControllers: guarded('eventControllers', async (req, res) => {
        send(res, 200, 'Contrôleurs', await EventControllerService.listForEvent(idParam(req)));
    }),
    inviteController: guarded('inviteController', async (req, res) => {
        const { phone, email } = (req.body ?? {}) as { phone?: string; email?: string };
        const result = await EventControllerService.invite(idParam(req), { phone, email }, { userId: req.userId });
        reply(res, result, 'Invitation envoyée', 201);
    }),
    revokeController: guarded('revokeController', async (req, res) => {
        reply(res, await EventControllerService.revoke(idParam(req), idParam(req, 'controllerId')), 'Accès révoqué');
    }),

    // ─── Organisateurs ───────────────────────────────────────────────
    listOrganizers: guarded('listOrganizers', async (req, res) => {
        send(res, 200, 'Organisateurs', await AdminOrganizersService.list(query(req)));
    }),
    organizerDetail: guarded('organizerDetail', async (req, res) => {
        reply(res, await AdminOrganizersService.detail(idParam(req)), 'Organisateur');
    }),
    createOrganizer: guarded('createOrganizer', async (req, res) => {
        reply(res, await AdminOrganizersService.create(req.body ?? {}, req.userId), 'Organisateur créé', 201);
    }),
    updateOrganizer: guarded('updateOrganizer', async (req, res) => {
        reply(res, await AdminOrganizersService.update(idParam(req), req.body ?? {}), 'Organisateur mis à jour');
    }),
    deleteOrganizer: guarded('deleteOrganizer', async (req, res) => {
        reply(res, await AdminOrganizersService.remove(idParam(req), req.userId), 'Organisateur supprimé');
    }),

    organizerProfileOfCustomer: guarded('organizerProfileOfCustomer', async (req, res) => {
        send(res, 200, 'Profil organisateur', await AdminOrganizersService.profileOfCustomer(idParam(req)));
    }),

    // ─── Reversements ────────────────────────────────────────────────
    balances: guarded('balances', async (_req, res) => {
        send(res, 200, 'Soldes des organisateurs', await AdminOrganizersService.balances());
    }),
    listPayouts: guarded('listPayouts', async (req, res) => {
        send(res, 200, 'Reversements', await AdminOrganizersService.payouts(query(req)));
    }),
    recordPayout: guarded('recordPayout', async (req, res) => {
        reply(res, await AdminOrganizersService.recordPayout(idParam(req), req.body ?? {}, req.userId), 'Reversement enregistré', 201);
    }),
    deletePayout: guarded('deletePayout', async (req, res) => {
        reply(res, await AdminOrganizersService.deletePayout(idParam(req), req.userId), 'Reversement annulé');
    }),

    // ─── Demandes d'annulation ───────────────────────────────────────
    cancellationRequests: guarded('cancellationRequests', async (req, res) => {
        send(res, 200, 'Demandes d\'annulation', await TicketCancellationService.list(query(req).status));
    }),
    approveCancellation: guarded('approveCancellation', async (req, res) => {
        const { refund_amount, note } = (req.body ?? {}) as { refund_amount?: number | string | null; note?: string };
        const amount = refund_amount === undefined || refund_amount === null || refund_amount === '' ? undefined : Number(refund_amount);
        reply(res, await TicketCancellationService.approve(idParam(req), req.userId, amount, note), 'Annulation acceptée');
    }),
    rejectCancellation: guarded('rejectCancellation', async (req, res) => {
        reply(res, await TicketCancellationService.reject(idParam(req), req.userId, (req.body ?? {}).note), 'Demande refusée');
    }),

    // ─── Commission ──────────────────────────────────────────────────
    getCommission: guarded('getCommission', async (_req, res) => {
        send(res, 200, 'Commission', { default_rate: await CommissionService.getDefaultRate() });
    }),
    updateCommission: guarded('updateCommission', async (req, res) => {
        const rate = Number((req.body ?? {}).default_rate);
        try {
            send(res, 200, 'Taux de commission mis à jour', { default_rate: await CommissionService.setDefaultRate(rate, req.userId) });
        } catch (error) {
            if (error instanceof RangeError) return send(res, 400, error.message);
            throw error;
        }
    }),

    // ─── Images ──────────────────────────────────────────────────────
    uploadedImage: (folder: string) => guarded('uploadedImage', async (req, res) => {
        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) return send(res, 400, 'Aucune image reçue (champ « image »)');
        send(res, 201, 'Image enregistrée', { path: `/uploads/${folder}/${file.filename}` });
    }),
};
