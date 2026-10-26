/**
 * Chiffres de vente d'un événement et solde d'un organisateur (§4.2) —
 * source unique pour adigo2 (suivi, reversements) et pour l'espace
 * organisateur de l'app, afin que les deux affichent toujours les mêmes
 * montants.
 */
import prismaDb from "../../config/prismaClient";
import { CommissionService } from "./commission.service";
import { retainedAmount, ticketCommission } from "../utils/ticketing-rules";

const ticketMoneySelect = {
    event_id: true,
    ticket_type_id: true,
    quantity: true,
    total_price: true,
    payment_status: true,
    status: true,
    refunded_amount: true,
    commission_rate: true,
    commission_amount: true,
    checked_in_count: true,
} as const;

export interface EventMoneySummary {
    /** Achats payés (une ligne de billet peut couvrir plusieurs personnes). */
    paid_purchases: number;
    /** Places payées. */
    paid_seats: number;
    /** Places réservées par un paiement Orange Money encore en cours. */
    pending_seats: number;
    /** Personnes déjà entrées. */
    checked_in: number;
    /** Montant encaissé et conservé (remboursements déduits). */
    gross: number;
    commission: number;
    organizer_net: number;
    refunded: number;
    paid_out: number;
    balance_due: number;
}

function emptySummary(): EventMoneySummary {
    return {
        paid_purchases: 0, paid_seats: 0, pending_seats: 0, checked_in: 0,
        gross: 0, commission: 0, organizer_net: 0, refunded: 0, paid_out: 0, balance_due: 0,
    };
}

type TicketMoneyRow = {
    event_id: number;
    ticket_type_id: number;
    quantity: number;
    total_price: number;
    payment_status: string | null;
    status: string | null;
    refunded_amount: number | null;
    commission_rate: unknown;
    commission_amount: number | null;
    checked_in_count: number;
};

function accumulate(summary: EventMoneySummary, t: TicketMoneyRow, rate: number) {
    const retained = retainedAmount(t);
    const commission = ticketCommission(t, rate);
    if (t.payment_status === 'paid' && (t.status === 'confirmed' || t.status === 'used')) {
        summary.paid_purchases += 1;
        summary.paid_seats += t.quantity;
    }
    if (t.status === 'pending') summary.pending_seats += t.quantity;
    if (t.payment_status === 'refunded') summary.refunded += t.refunded_amount ?? t.total_price;
    summary.checked_in += t.checked_in_count;
    summary.gross += retained;
    summary.commission += commission;
    summary.organizer_net += retained - commission;
}

export class EventStatsService {

    /** Résumé financier de plusieurs événements (listes adigo2 / app). */
    static async summarizeEvents(eventIds: number[]): Promise<Map<number, EventMoneySummary>> {
        const result = new Map<number, EventMoneySummary>();
        if (eventIds.length === 0) return result;
        for (const id of eventIds) result.set(id, emptySummary());

        const [events, tickets, payouts] = await Promise.all([
            prismaDb.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, organizer_id: true } }),
            prismaDb.event_ticket.findMany({ where: { event_id: { in: eventIds }, is_deleted: false }, select: ticketMoneySelect }),
            prismaDb.organizer_payout.groupBy({
                by: ['event_id'],
                where: { event_id: { in: eventIds }, is_deleted: false },
                _sum: { amount: true },
            }),
        ]);
        const rates = await CommissionService.ratesForOrganizers(Array.from(new Set(events.map((e) => e.organizer_id))));
        const organizerOf = new Map(events.map((e) => [e.id, e.organizer_id]));

        for (const t of tickets) {
            const rate = rates.get(organizerOf.get(t.event_id) ?? -1) ?? 0;
            accumulate(result.get(t.event_id)!, t, rate);
        }
        for (const p of payouts) {
            if (p.event_id == null) continue;
            const s = result.get(p.event_id);
            if (s) s.paid_out += p._sum.amount ?? 0;
        }
        for (const s of result.values()) s.balance_due = s.organizer_net - s.paid_out;
        return result;
    }

    /** Détail par type de billet + résumé, pour l'écran de suivi d'un événement. */
    static async eventDetail(eventId: number) {
        const [types, tickets, event] = await Promise.all([
            prismaDb.event_ticket_type.findMany({ where: { event_id: eventId }, orderBy: { price: 'asc' } }),
            prismaDb.event_ticket.findMany({ where: { event_id: eventId, is_deleted: false }, select: ticketMoneySelect }),
            prismaDb.event.findUnique({ where: { id: eventId }, select: { organizer_id: true } }),
        ]);
        const rate = event ? await CommissionService.rateForOrganizer(event.organizer_id) : 0;
        const summary = (await this.summarizeEvents([eventId])).get(eventId) ?? emptySummary();

        const byType = new Map<number, { paid_seats: number; pending_seats: number; checked_in: number; gross: number }>();
        for (const t of tickets) {
            const cur = byType.get(t.ticket_type_id) ?? { paid_seats: 0, pending_seats: 0, checked_in: 0, gross: 0 };
            if (t.payment_status === 'paid' && (t.status === 'confirmed' || t.status === 'used')) cur.paid_seats += t.quantity;
            if (t.status === 'pending') cur.pending_seats += t.quantity;
            cur.checked_in += t.checked_in_count;
            cur.gross += retainedAmount(t);
            byType.set(t.ticket_type_id, cur);
        }

        return {
            commission_rate: rate,
            summary,
            ticket_types: types.map((tt) => {
                const s = byType.get(tt.id) ?? { paid_seats: 0, pending_seats: 0, checked_in: 0, gross: 0 };
                return {
                    id: tt.id,
                    name: tt.name,
                    description: tt.description,
                    price: tt.price,
                    quantity: tt.quantity,
                    // `sold` compte les places réservées (payées + paiement en cours).
                    reserved: tt.sold ?? 0,
                    remaining: Math.max(0, tt.quantity - (tt.sold ?? 0)),
                    max_per_order: tt.max_per_order,
                    sale_start: tt.sale_start,
                    sale_end: tt.sale_end,
                    is_active: tt.is_active,
                    ...s,
                };
            }),
        };
    }

    /** Solde de plusieurs organisateurs (liste adigo2 « Reversements »). */
    static async balancesForOrganizers(organizerIds: number[]) {
        const result = new Map<number, { gross: number; commission: number; organizer_net: number; paid_out: number; balance_due: number; events_count: number }>();
        if (organizerIds.length === 0) return result;
        for (const id of organizerIds) {
            result.set(id, { gross: 0, commission: 0, organizer_net: 0, paid_out: 0, balance_due: 0, events_count: 0 });
        }

        const [events, payouts] = await Promise.all([
            prismaDb.event.findMany({ where: { organizer_id: { in: organizerIds }, is_deleted: false }, select: { id: true, organizer_id: true } }),
            prismaDb.organizer_payout.groupBy({
                by: ['organizer_id'],
                where: { organizer_id: { in: organizerIds }, is_deleted: false },
                _sum: { amount: true },
            }),
        ]);
        const summaries = await this.summarizeEvents(events.map((e) => e.id));
        for (const e of events) {
            const r = result.get(e.organizer_id)!;
            const s = summaries.get(e.id)!;
            r.events_count += 1;
            r.gross += s.gross;
            r.commission += s.commission;
            r.organizer_net += s.organizer_net;
        }
        for (const p of payouts) {
            const r = result.get(p.organizer_id);
            if (r) r.paid_out += p._sum.amount ?? 0;
        }
        for (const r of result.values()) r.balance_due = r.organizer_net - r.paid_out;
        return result;
    }

    /** Solde détaillé d'un organisateur, par événement, avec ses reversements. */
    static async organizerBalance(organizerId: number) {
        const [events, payouts, rate] = await Promise.all([
            prismaDb.event.findMany({
                where: { organizer_id: organizerId, is_deleted: false },
                select: { id: true, title: true, code: true, event_date: true, status: true },
                orderBy: { event_date: 'desc' },
            }),
            prismaDb.organizer_payout.findMany({
                where: { organizer_id: organizerId, is_deleted: false },
                include: { event: { select: { id: true, title: true, code: true } } },
                orderBy: { paid_at: 'desc' },
            }),
            CommissionService.rateForOrganizer(organizerId),
        ]);
        const summaries = await this.summarizeEvents(events.map((e) => e.id));
        const totals = { gross: 0, commission: 0, organizer_net: 0, paid_out: 0, balance_due: 0 };
        for (const s of summaries.values()) {
            totals.gross += s.gross;
            totals.commission += s.commission;
            totals.organizer_net += s.organizer_net;
        }
        for (const p of payouts) totals.paid_out += p.amount;
        totals.balance_due = totals.organizer_net - totals.paid_out;

        return {
            commission_rate: rate,
            totals,
            events: events.map((e) => ({ ...e, ...summaries.get(e.id)! })),
            payouts,
        };
    }
}
