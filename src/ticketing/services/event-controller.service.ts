/**
 * Invitations contrôleur, événement par événement
 * (TICKETING_MODULE_PLAN_2026-10.md §3.3).
 *
 * invitée → acceptée | refusée | expirée ; acceptée → révoquée. L'accès
 * d'un contrôleur accepté se termine de lui-même avec la fenêtre de scan
 * de l'événement (isScanWindowOpen) — aucun changement d'état nécessaire.
 * L'admin (adigo2) et l'organisateur (app, ses propres événements) passent
 * par les mêmes méthodes ; seul `inviter` change.
 */
import prismaDb from "../../config/prismaClient";
import { TicketingNotifier } from "./ticketing-notifier.service";
import { eventClosesAt, hasEnded, isScanWindowOpen, phoneCandidates } from "../utils/ticketing-rules";

type Result<T> = { ok: true; body: T } | { ok: false; code: number; message: string };

export interface Inviter {
    userId?: number;
    customerId?: number;
}

const controllerInclude = {
    customer: { select: { id: true, first_name: true, last_name: true, phone: true, email: true, profile_picture: true } },
} as const;

const invitationEventSelect = {
    id: true, title: true, code: true, event_date: true, event_end_date: true, venue_name: true, city: true,
    cover_image: true, status: true,
    event_organizer: { select: { id: true, name: true, logo: true } },
} as const;

export class EventControllerService {

    static async findInvitee(identifier: { phone?: string; email?: string }) {
        if (identifier.phone?.trim()) {
            return prismaDb.customer.findFirst({
                where: { phone: { in: phoneCandidates(identifier.phone) }, is_deleted: false },
                select: { id: true, first_name: true, last_name: true, phone: true, email: true, is_active: true },
            });
        }
        if (identifier.email?.trim()) {
            return prismaDb.customer.findFirst({
                where: { email: { equals: identifier.email.trim(), mode: 'insensitive' }, is_deleted: false },
                select: { id: true, first_name: true, last_name: true, phone: true, email: true, is_active: true },
            });
        }
        return null;
    }

    static async invite(eventId: number, identifier: { phone?: string; email?: string }, inviter: Inviter): Promise<Result<unknown>> {
        if (!identifier.phone?.trim() && !identifier.email?.trim()) {
            return { ok: false, code: 400, message: 'Indiquez le numéro de téléphone ou l\'email du compte ADIGO à inviter' };
        }
        const event = await prismaDb.event.findFirst({
            where: { id: eventId, is_deleted: false },
            include: { event_organizer: { select: { customer_id: true } } },
        });
        if (!event) return { ok: false, code: 404, message: 'Événement introuvable' };
        if (event.status === 'cancelled' || event.status === 'completed' || hasEnded(event)) {
            return { ok: false, code: 400, message: 'Impossible d\'inviter des contrôleurs sur un événement terminé ou annulé' };
        }

        const invitee = await this.findInvitee(identifier);
        if (!invitee || invitee.is_active === false) {
            return { ok: false, code: 404, message: 'Cette personne doit d\'abord créer un compte ADIGO' };
        }
        if (invitee.id === event.event_organizer?.customer_id) {
            return { ok: false, code: 400, message: 'L\'organisateur peut déjà scanner les billets de ses événements' };
        }

        const existing = await prismaDb.event_controller.findUnique({
            where: { event_id_customer_id: { event_id: eventId, customer_id: invitee.id } },
        });
        if (existing?.status === 'invited') return { ok: false, code: 409, message: 'Cette personne a déjà une invitation en attente' };
        if (existing?.status === 'accepted') return { ok: false, code: 409, message: 'Cette personne est déjà contrôleur de cet événement' };

        const data = {
            status: 'invited',
            invited_by_user_id: inviter.userId ?? null,
            invited_by_customer_id: inviter.customerId ?? null,
            invited_at: new Date(),
            responded_at: null,
            revoked_at: null,
        };
        const row = existing
            ? await prismaDb.event_controller.update({ where: { id: existing.id }, data, include: controllerInclude })
            : await prismaDb.event_controller.create({ data: { event_id: eventId, customer_id: invitee.id, ...data }, include: controllerInclude });

        void TicketingNotifier.invitationSent(row.id);
        return { ok: true, body: row };
    }

    static async listForEvent(eventId: number) {
        const [rows, scans] = await Promise.all([
            prismaDb.event_controller.findMany({
                where: { event_id: eventId },
                include: controllerInclude,
                orderBy: { invited_at: 'desc' },
            }),
            prismaDb.ticket_scan.groupBy({
                by: ['scanned_by_customer_id'],
                where: { event_id: eventId, scanned_by_customer_id: { not: null } },
                _sum: { admitted: true },
                _count: { _all: true },
            }),
        ]);
        const scansBy = new Map(scans.map((s) => [s.scanned_by_customer_id, s]));
        return rows.map((r) => ({
            ...r,
            scans_count: scansBy.get(r.customer_id)?._count._all ?? 0,
            admitted_count: scansBy.get(r.customer_id)?._sum.admitted ?? 0,
        }));
    }

    /** Révocation par l'admin ou l'organisateur, sur une invitation en attente ou acceptée. */
    static async revoke(eventId: number, controllerId: number): Promise<Result<unknown>> {
        const updated = await prismaDb.event_controller.updateMany({
            where: { id: controllerId, event_id: eventId, status: { in: ['invited', 'accepted'] } },
            data: { status: 'revoked', revoked_at: new Date() },
        });
        if (updated.count === 0) return { ok: false, code: 404, message: 'Invitation introuvable ou déjà close' };
        void TicketingNotifier.controllerRevoked(controllerId);
        return { ok: true, body: await prismaDb.event_controller.findUnique({ where: { id: controllerId }, include: controllerInclude }) };
    }

    /** Invitations en attente du client connecté (badge + liste dans l'app). */
    static async pendingInvitations(customerId: number) {
        const rows = await prismaDb.event_controller.findMany({
            where: { customer_id: customerId, status: 'invited', event: { is_deleted: false, status: { in: ['draft', 'published'] } } },
            include: { event: { select: invitationEventSelect } },
            orderBy: { invited_at: 'desc' },
        });
        return rows.filter((r) => !hasEnded(r.event));
    }

    static async respond(controllerId: number, customerId: number, accept: boolean): Promise<Result<unknown>> {
        const row = await prismaDb.event_controller.findFirst({
            where: { id: controllerId, customer_id: customerId },
            include: { event: true },
        });
        if (!row) return { ok: false, code: 404, message: 'Invitation introuvable' };
        if (row.status !== 'invited') return { ok: false, code: 400, message: 'Cette invitation n\'est plus en attente' };
        if (row.event.is_deleted || row.event.status === 'cancelled' || hasEnded(row.event)) {
            await prismaDb.event_controller.update({ where: { id: row.id }, data: { status: 'expired', responded_at: new Date() } });
            return { ok: false, code: 400, message: 'Cet événement est terminé ou annulé' };
        }

        const updated = await prismaDb.event_controller.updateMany({
            where: { id: controllerId, status: 'invited' },
            data: { status: accept ? 'accepted' : 'declined', responded_at: new Date() },
        });
        if (updated.count === 0) return { ok: false, code: 409, message: 'Cette invitation n\'est plus en attente' };
        void TicketingNotifier.invitationOutcome(controllerId);
        return { ok: true, body: await prismaDb.event_controller.findUnique({ where: { id: controllerId }, include: { event: { select: invitationEventSelect } } }) };
    }

    /**
     * Événements que ce compte peut scanner : ceux de son organisateur, et
     * ceux pour lesquels il a accepté une invitation. `can_scan_now` dit si
     * la fenêtre de scan est ouverte en ce moment.
     */
    static async scannableEvents(customerId: number) {
        const [owned, controlled] = await Promise.all([
            prismaDb.event.findMany({
                where: { is_deleted: false, status: 'published', event_organizer: { customer_id: customerId, is_deleted: false } },
                select: invitationEventSelect,
            }),
            prismaDb.event_controller.findMany({
                where: { customer_id: customerId, status: 'accepted', event: { is_deleted: false, status: 'published' } },
                select: { event: { select: invitationEventSelect } },
            }),
        ]);
        const byId = new Map<number, { event: (typeof owned)[number]; role: 'organizer' | 'controller' }>();
        for (const e of owned) byId.set(e.id, { event: e, role: 'organizer' });
        for (const c of controlled) if (!byId.has(c.event.id)) byId.set(c.event.id, { event: c.event, role: 'controller' });

        const now = new Date();
        return Array.from(byId.values())
            .filter(({ event }) => now <= eventClosesAt(event))
            .map(({ event, role }) => ({ ...event, role, can_scan_now: isScanWindowOpen(event, now) }))
            .sort((a, b) => a.event_date.getTime() - b.event_date.getTime());
    }

    /** Tâche planifiée : une invitation sans réponse expire au début de l'événement (ou à son annulation). */
    static async expireStaleInvitations(): Promise<number> {
        const stale = await prismaDb.event_controller.findMany({
            where: {
                status: 'invited',
                OR: [
                    { event: { event_date: { lte: new Date() } } },
                    { event: { status: { in: ['cancelled', 'completed'] } } },
                    { event: { is_deleted: true } },
                ],
            },
            select: { id: true },
        });
        let count = 0;
        for (const row of stale) {
            const updated = await prismaDb.event_controller.updateMany({
                where: { id: row.id, status: 'invited' },
                data: { status: 'expired', responded_at: new Date() },
            });
            if (updated.count === 1) {
                count += 1;
                void TicketingNotifier.invitationOutcome(row.id);
            }
        }
        return count;
    }

    /** À l'annulation d'un événement : toutes les invitations et accès en cours sont révoqués. */
    static async revokeAllForEvent(eventId: number): Promise<void> {
        await prismaDb.event_controller.updateMany({
            where: { event_id: eventId, status: { in: ['invited', 'accepted'] } },
            data: { status: 'revoked', revoked_at: new Date() },
        });
    }
}
