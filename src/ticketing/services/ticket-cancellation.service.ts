/**
 * Annulation d'un billet par son acheteur (TICKETING_MODULE_PLAN_2026-10.md §3.2),
 * alignée sur la réservation de bus : un billet PAYÉ ne s'annule pas
 * directement, le client envoie une demande qu'un admin accepte (avec
 * remboursement sur le portefeuille, total ou partiel selon la politique
 * de l'événement) ou refuse dans adigo2. Un billet pas encore payé
 * (paiement Orange Money en cours) s'annule tout de suite.
 */
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { TicketPurchaseService } from "./ticket-purchase.service";
import { TicketRefundService } from "./ticket-refund.service";
import { TicketingNotifier } from "./ticketing-notifier.service";
import { hasEnded } from "../utils/ticketing-rules";

type Result<T = unknown> = { ok: true; body: T; message: string } | { ok: false; code: number; message: string };

export class TicketCancellationService {

    /** Appelé par le client (PATCH /tickets/:id/cancel). */
    static async requestByCustomer(ticketId: number, customerId: number, reason: string | undefined): Promise<Result> {
        const ticket = await prismaDb.event_ticket.findFirst({
            where: { id: ticketId, is_deleted: false },
            include: { event: true },
        });
        if (!ticket || ticket.customer_id !== customerId) return { ok: false, code: 404, message: 'Billet introuvable' };

        if (ticket.status === 'pending' && ticket.payment_status !== 'paid') {
            const cancelled = await TicketPurchaseService.cancelUnpaid(ticketId);
            if (!cancelled) return { ok: false, code: 409, message: 'Ce billet vient de changer d\'état, réessayez' };
            void TicketingNotifier.ticketCancelled(ticketId);
            return { ok: true, body: await prismaDb.event_ticket.findUnique({ where: { id: ticketId } }), message: 'Billet annulé' };
        }

        if (ticket.status !== 'confirmed' || ticket.payment_status !== 'paid') {
            return { ok: false, code: 400, message: 'Ce billet ne peut pas être annulé' };
        }
        if (ticket.checked_in_count > 0) return { ok: false, code: 400, message: 'Ce billet a déjà été utilisé à l\'entrée' };
        if (hasEnded(ticket.event)) return { ok: false, code: 400, message: 'Cet événement est terminé' };
        if (ticket.cancel_request_status === 'requested') {
            return { ok: false, code: 409, message: 'Une demande d\'annulation est déjà en cours pour ce billet' };
        }
        const text = reason?.trim();
        if (!text) return { ok: false, code: 400, message: 'Indiquez le motif de votre demande' };

        const updated = await prismaDb.event_ticket.updateMany({
            // `cancel_request_status` est NULL tant qu'aucune demande n'a été
            // faite : `not: 'requested'` seul exclurait ces lignes en SQL.
            where: {
                id: ticketId, status: 'confirmed', payment_status: 'paid',
                OR: [{ cancel_request_status: null }, { cancel_request_status: { in: ['approved', 'rejected'] } }],
            },
            data: {
                cancel_request_status: 'requested',
                cancel_requested_at: new Date(),
                cancel_request_reason: text,
                cancel_decided_at: null,
                cancel_decided_by: null,
                cancel_decision_note: null,
            },
        });
        if (updated.count === 0) return { ok: false, code: 409, message: 'Ce billet vient de changer d\'état, réessayez' };
        void TicketingNotifier.cancellationRequested(ticketId, text);
        return {
            ok: true,
            body: await prismaDb.event_ticket.findUnique({ where: { id: ticketId } }),
            message: 'Demande d\'annulation envoyée — ADIGO vous répondra rapidement',
        };
    }

    static async list(status: string | undefined) {
        const where: Prisma.event_ticketWhereInput = {
            is_deleted: false,
            cancel_request_status: status && ['requested', 'approved', 'rejected'].includes(status) ? status : 'requested',
        };
        const rows = await prismaDb.event_ticket.findMany({
            where,
            include: {
                customer: { select: { id: true, first_name: true, last_name: true, phone: true, email: true } },
                event: { select: { id: true, title: true, code: true, event_date: true, cancellation_policy: true, refund_policy: true } },
                event_ticket_type: { select: { id: true, name: true } },
            },
            orderBy: { cancel_requested_at: 'desc' },
            take: 500,
        });
        return rows.map(({ event_ticket_type, commission_rate, ...r }) => ({
            ...r,
            commission_rate: commission_rate != null ? Number(commission_rate) : null,
            ticket_type: event_ticket_type,
        }));
    }

    static async approve(ticketId: number, adminId: number | undefined, refundAmount: number | undefined, note: string | undefined): Promise<Result> {
        const ticket = await prismaDb.event_ticket.findFirst({ where: { id: ticketId, is_deleted: false } });
        if (!ticket || ticket.cancel_request_status !== 'requested') {
            return { ok: false, code: 404, message: 'Aucune demande d\'annulation en attente pour ce billet' };
        }
        const refund = await TicketRefundService.refund(ticketId, {
            amount: refundAmount,
            reason: note?.trim() ? `Annulation acceptée : ${note.trim()}` : 'Annulation acceptée',
        });
        if (refund.ok === false) return refund;

        await prismaDb.event_ticket.update({
            where: { id: ticketId },
            data: {
                cancel_request_status: 'approved',
                cancel_decided_at: new Date(),
                cancel_decided_by: adminId ?? null,
                cancel_decision_note: note?.trim() || null,
            },
        });
        void TicketingNotifier.cancellationDecision(ticketId, true, refund.amount, note);
        return {
            ok: true,
            body: await prismaDb.event_ticket.findUnique({ where: { id: ticketId } }),
            message: `Annulation acceptée — ${refund.amount} XAF remboursés sur le portefeuille`,
        };
    }

    static async reject(ticketId: number, adminId: number | undefined, note: string | undefined): Promise<Result> {
        if (!note?.trim()) return { ok: false, code: 400, message: 'Indiquez le motif du refus' };
        const updated = await prismaDb.event_ticket.updateMany({
            where: { id: ticketId, is_deleted: false, cancel_request_status: 'requested' },
            data: {
                cancel_request_status: 'rejected',
                cancel_decided_at: new Date(),
                cancel_decided_by: adminId ?? null,
                cancel_decision_note: note.trim(),
            },
        });
        if (updated.count === 0) return { ok: false, code: 404, message: 'Aucune demande d\'annulation en attente pour ce billet' };
        void TicketingNotifier.cancellationDecision(ticketId, false, 0, note);
        return { ok: true, body: await prismaDb.event_ticket.findUnique({ where: { id: ticketId } }), message: 'Demande refusée' };
    }
}
