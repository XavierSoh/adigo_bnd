/**
 * Contrôle des billets à l'entrée (TICKETING_MODULE_PLAN_2026-10.md §5.3).
 *
 * Deux temps : `lookup` lit le billet sans rien changer (le contrôleur voit
 * l'acheteur, le type et le nombre de personnes restant à admettre), puis
 * `admit` fait entrer 1…N personnes. Un billet acheté pour plusieurs
 * personnes a un seul QR : `checked_in_count` compte les entrées et le
 * billet passe en « utilisé » quand tout le monde est entré.
 */
import prismaDb from "../../config/prismaClient";
import { TicketingNotifier } from "./ticketing-notifier.service";
import { isScanWindowOpen } from "../utils/ticketing-rules";

export type ScanOutcome = 'valid' | 'already_used' | 'unpaid' | 'cancelled' | 'wrong_event' | 'not_found' | 'closed';

export interface Scanner {
    customerId?: number;
    userId?: number;
}

const ticketInclude = {
    customer: { select: { first_name: true, last_name: true, phone: true } },
    event_ticket_type: { select: { name: true } },
    event: { select: { id: true, title: true } },
} as const;

async function lastScan(ticketId: number) {
    const scan = await prismaDb.ticket_scan.findFirst({ where: { ticket_id: ticketId }, orderBy: { scanned_at: 'desc' } });
    if (!scan) return null;
    let by: string | null = null;
    if (scan.scanned_by_customer_id) {
        const c = await prismaDb.customer.findUnique({
            where: { id: scan.scanned_by_customer_id },
            select: { first_name: true, last_name: true },
        });
        by = c ? `${c.first_name} ${c.last_name}`.trim() : null;
    } else if (scan.scanned_by_user_id) {
        by = 'ADIGO';
    }
    return { scanned_at: scan.scanned_at, admitted: scan.admitted, by };
}

export class TicketScanService {

    static async lookup(eventId: number, qrCode: string) {
        const event = await prismaDb.event.findFirst({ where: { id: eventId, is_deleted: false } });
        if (!event) return { result: 'not_found' as ScanOutcome, message: 'Événement introuvable' };
        if (event.status !== 'published' || !isScanWindowOpen(event)) {
            return {
                result: 'closed' as ScanOutcome,
                message: event.status === 'cancelled' ? 'Cet événement est annulé' : 'Le contrôle des billets n\'est pas ouvert pour cet événement',
            };
        }

        // Le QR contient un identifiant opaque ; la référence imprimée sur
        // le billet (TK123456) est acceptée aussi, saisie à la main quand
        // le QR est illisible (écran fissuré, luminosité…).
        const code = qrCode.trim();
        const ticket = await prismaDb.event_ticket.findFirst({
            where: { is_deleted: false, OR: [{ qr_code: code }, { reference: code.toUpperCase() }] },
            include: ticketInclude,
        });
        if (!ticket) return { result: 'not_found' as ScanOutcome, message: 'QR code inconnu' };

        const info = {
            id: ticket.id,
            reference: ticket.reference,
            buyer_name: `${ticket.customer.first_name} ${ticket.customer.last_name}`.trim(),
            buyer_phone: ticket.customer.phone,
            ticket_type: ticket.event_ticket_type.name,
            quantity: ticket.quantity,
            checked_in_count: ticket.checked_in_count,
            remaining: Math.max(0, ticket.quantity - ticket.checked_in_count),
        };

        if (ticket.event_id !== eventId) {
            return { result: 'wrong_event' as ScanOutcome, message: `Billet pour un autre événement : ${ticket.event.title}`, ticket: info };
        }
        if (ticket.status === 'cancelled' || ticket.status === 'expired' || ticket.payment_status === 'refunded') {
            return { result: 'cancelled' as ScanOutcome, message: 'Billet annulé ou remboursé', ticket: info };
        }
        if (ticket.payment_status !== 'paid') {
            return { result: 'unpaid' as ScanOutcome, message: 'Billet non payé', ticket: info };
        }
        if (info.remaining === 0) {
            return { result: 'already_used' as ScanOutcome, message: 'Billet déjà utilisé', ticket: info, last_scan: await lastScan(ticket.id) };
        }
        return { result: 'valid' as ScanOutcome, message: 'Billet valide', ticket: info, last_scan: await lastScan(ticket.id) };
    }

    static async admit(eventId: number, qrCode: string, count: number, scanner: Scanner) {
        const check = await this.lookup(eventId, qrCode);
        if (check.result !== 'valid' || !check.ticket) return { ok: false as const, ...check };

        const remaining = check.ticket.remaining;
        if (!Number.isInteger(count) || count < 1 || count > remaining) {
            return { ok: false as const, result: 'valid' as ScanOutcome, message: `Nombre de personnes invalide (1 à ${remaining})`, ticket: check.ticket };
        }

        const ticketId = check.ticket.id;
        const admitted = await prismaDb.$transaction(async (tx) => {
            // Garde atomique : deux contrôleurs qui scannent le même QR en
            // même temps ne peuvent pas faire entrer plus que prévu.
            const updated = await tx.event_ticket.updateMany({
                where: { id: ticketId, payment_status: 'paid', checked_in_count: { lte: check.ticket!.quantity - count } },
                data: { checked_in_count: { increment: count }, used_at: new Date() },
            });
            if (updated.count === 0) return false;
            await tx.event_ticket.updateMany({
                where: { id: ticketId, checked_in_count: { gte: check.ticket!.quantity } },
                data: { status: 'used' },
            });
            await tx.ticket_scan.create({
                data: {
                    ticket_id: ticketId,
                    event_id: eventId,
                    admitted: count,
                    scanned_by_customer_id: scanner.customerId ?? null,
                    scanned_by_user_id: scanner.userId ?? null,
                },
            });
            return true;
        });

        if (!admitted) {
            const fresh = await this.lookup(eventId, qrCode);
            return { ok: false as const, ...fresh, message: 'Ce billet vient d\'être scanné par un autre contrôleur' };
        }

        void TicketingNotifier.ticketScanned(ticketId, count);
        const after = await this.lookup(eventId, qrCode);
        return { ok: true as const, admitted: count, ticket: after.ticket, result: after.result, message: `${count} personne(s) admise(s)` };
    }
}
