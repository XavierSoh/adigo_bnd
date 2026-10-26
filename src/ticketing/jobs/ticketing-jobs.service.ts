/**
 * Tâches planifiées de la billetterie (TICKETING_MODULE_PLAN_2026-10.md) —
 * même mécanisme node-cron que VtcRideExpiryService, démarré une fois au
 * boot depuis initFirtsItems.ts.
 *
 * Toutes les 5 minutes :
 * 1. Billets Orange Money impayés depuis plus de 30 min : on redemande
 *    d'abord le statut au fournisseur (un paiement peut avoir abouti sans
 *    webhook), puis on fait expirer ce qui reste impayé — la place est
 *    rendue et l'acheteur prévenu (§3.2).
 * 2. Événements publiés dont la fenêtre de scan est close : passage en
 *    « terminé » et envoi du bilan à l'organisateur et aux admins (§5.5).
 * 3. Invitations contrôleur sans réponse au début de l'événement : expirées
 *    et l'invitant prévenu (§3.3).
 */
import cron from 'node-cron';
import prismaDb from '../../config/prismaClient';
import { PaymentService } from '../../services/payment/payment.service';
import { TicketPurchaseService } from '../services/ticket-purchase.service';
import { TicketingNotifier } from '../services/ticketing-notifier.service';
import { EventControllerService } from '../services/event-controller.service';
import { EventStatsService } from '../services/event-stats.service';
import { PENDING_PAYMENT_EXPIRY_MINUTES, eventClosesAt } from '../utils/ticketing-rules';

export class TicketingJobs {

    static async expireStalePayments(): Promise<number> {
        const cutoff = new Date(Date.now() - PENDING_PAYMENT_EXPIRY_MINUTES * 60 * 1000);
        const stale = await prismaDb.event_ticket.findMany({
            where: { status: 'pending', payment_status: 'pending', payment_method: 'orangeMoney', is_deleted: false, created_at: { lt: cutoff } },
            select: { id: true },
        });

        let expired = 0;
        for (const { id } of stale) {
            const tx = await prismaDb.payment_transaction.findFirst({
                where: { purpose: 'ticket_purchase', purpose_ref_id: id },
                orderBy: { created_at: 'desc' },
            });
            if (tx?.pay_token && !tx.settled) {
                try {
                    await PaymentService.checkStatus(tx.pay_token);
                } catch (error) {
                    console.error(`TicketingJobs: OM status check failed for ticket ${id}:`, error);
                }
            }
            if (await TicketPurchaseService.expireUnpaid(id)) {
                expired += 1;
                void TicketingNotifier.ticketExpired(id);
            }
        }
        return expired;
    }

    static async completeEndedEvents(): Promise<number> {
        const now = new Date();
        const candidates = await prismaDb.event.findMany({
            where: { status: 'published', is_deleted: false, event_date: { lt: now } },
            select: { id: true, event_date: true, event_end_date: true },
        });

        let completed = 0;
        for (const e of candidates.filter((c) => eventClosesAt(c) < now)) {
            const updated = await prismaDb.event.updateMany({
                where: { id: e.id, status: 'published' },
                data: { status: 'completed', updated_at: now },
            });
            if (updated.count === 1) {
                completed += 1;
                const summary = (await EventStatsService.summarizeEvents([e.id])).get(e.id);
                if (summary) void TicketingNotifier.eventCompleted(e.id, summary);
            }
        }
        return completed;
    }

    static async runOnce(): Promise<void> {
        const steps: Array<[string, () => Promise<number>]> = [
            ['billet(s) Orange Money expiré(s)', () => this.expireStalePayments()],
            ['événement(s) terminé(s)', () => this.completeEndedEvents()],
            ['invitation(s) contrôleur expirée(s)', () => EventControllerService.expireStaleInvitations()],
        ];
        for (const [label, step] of steps) {
            try {
                const n = await step();
                if (n > 0) console.log(`🎟️ Billetterie : ${n} ${label}`);
            } catch (error) {
                console.error(`Erreur TicketingJobs (${label}):`, error);
            }
        }
    }

    startScheduling(): void {
        cron.schedule('*/5 * * * *', () => {
            void TicketingJobs.runOnce();
        });
    }
}

export const ticketingJobs = new TicketingJobs();
