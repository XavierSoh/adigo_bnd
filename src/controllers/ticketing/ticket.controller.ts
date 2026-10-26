import { Request, Response } from "express";
import prismaDb from "../../config/prismaClient";
import { TicketRepository } from "../../repository/ticketing/ticket.repository";
import { PaymentService } from "../../services/payment/payment.service";
import { AdminNotificationService, AdminLabel } from "../../services/adminNotification.service";
import { Language } from "../../utils/i18n";
import { TicketPurchaseDto } from "../../models/ticketing";
import { TicketPurchaseService } from "../../ticketing/services/ticket-purchase.service";
import { TicketCancellationService } from "../../ticketing/services/ticket-cancellation.service";
import { TicketScanService } from "../../ticketing/services/ticket-scan.service";
import { CommissionService } from "../../ticketing/services/commission.service";
import { TicketingNotifier } from "../../ticketing/services/ticketing-notifier.service";

/** Un token client ne porte pas de rôle ; un token staff/admin en porte un. */
function isCustomerToken(req: Request): boolean {
    return !req.userRole;
}

function ownsOrStaff(req: Request, customerId: number): boolean {
    return !isCustomerToken(req) || req.userId === customerId;
}

export class TicketController {

    static async getMyTickets(req: Request, res: Response) {
        const customerId = parseInt((req.params as { customerId: string }).customerId);
        if (!ownsOrStaff(req, customerId)) {
            res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
            return;
        }
        const response = await TicketRepository.findByCustomerId(customerId);
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const response = await TicketRepository.findById(parseInt((req.params as { id: string }).id));
        if (response.status && !ownsOrStaff(req, (response.body as { customer_id: number }).customer_id)) {
            res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
            return;
        }
        res.status(response.code).json(response);
    }

    static async getByReference(req: Request, res: Response) {
        const response = await TicketRepository.findByReference((req.params as { reference: string }).reference);
        if (response.status && !ownsOrStaff(req, (response.body as { customer_id: number }).customer_id)) {
            res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
            return;
        }
        res.status(response.code).json(response);
    }

    /**
     * Achat (TICKETING_MODULE_PLAN_2026-10.md §5.2) : vérifie que le billet
     * est en vente, réserve la place sous verrou, puis paie.
     * - wallet : débit dans la même transaction, billet payé immédiatement ;
     * - orangeMoney : billet en attente, place réservée 30 min ;
     * - cash : guichet uniquement (token staff), confirmé ensuite par
     *   PATCH /tickets/:id/payment. L'app n'offre jamais l'espèce.
     */
    static async purchase(req: Request, res: Response) {
        const lang: Language = req.lang || 'fr';
        try {
            const data = req.body as TicketPurchaseDto;
            const eventId = Number(data.event_id);
            const ticketTypeId = Number(data.ticket_type_id);
            const customerId = Number(data.customer_id);
            const quantity = Number(data.quantity);
            const method = data.payment_method;

            if (!eventId || !ticketTypeId || !customerId || !quantity || !method) {
                res.status(400).json({ status: false, message: "event_id, ticket_type_id, customer_id, quantity et payment_method sont requis", code: 400 });
                return;
            }
            if (!ownsOrStaff(req, customerId)) {
                res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
                return;
            }
            if (method === 'mtn') {
                res.status(400).json({ status: false, message: "MTN Mobile Money n'est pas encore disponible. Utilisez le portefeuille ou Orange Money.", code: 400 });
                return;
            }
            if (method === 'cash' && isCustomerToken(req)) {
                res.status(400).json({ status: false, message: "Le paiement en espèces n'est possible qu'au guichet.", code: 400 });
                return;
            }
            if (!['wallet', 'orangeMoney', 'cash'].includes(method)) {
                res.status(400).json({ status: false, message: "Moyen de paiement invalide", code: 400 });
                return;
            }
            if (method === 'orangeMoney' && !data.subscriber_msisdn) {
                res.status(400).json({ status: false, message: "subscriber_msisdn est requis pour un paiement Orange Money", code: 400 });
                return;
            }

            const sellable = await TicketPurchaseService.checkSellable(eventId, ticketTypeId, quantity);
            if (sellable.ok === false) {
                res.status(sellable.code).json({ status: false, message: sellable.message, code: sellable.code });
                return;
            }
            const commissionRate = await CommissionService.rateForOrganizer(sellable.event.organizer_id);

            const created = await TicketPurchaseService.create({
                eventId, ticketTypeId, customerId, quantity, method,
                unitPrice: sellable.unitPrice, commissionRate,
            });
            if (created.ok === false) {
                res.status(created.code).json({ status: false, message: created.message, code: created.code });
                return;
            }
            const ticket = created.ticket;

            if (method === 'wallet') {
                void TicketingNotifier.purchaseConfirmed(ticket.id);
                TicketController.notifyAdminSale(ticket.id, 'Wallet');
                res.status(201).json(await TicketRepository.findById(ticket.id));
                return;
            }

            if (method === 'orangeMoney') {
                const paymentResult = await PaymentService.initiate({
                    customerId,
                    purpose: 'ticket_purchase',
                    purposeRefId: ticket.id,
                    subscriberMsisdn: data.subscriber_msisdn!,
                    amount: ticket.total_price,
                    description: `Achat ticket - ${ticket.reference}`,
                });
                if (!paymentResult.status) {
                    await TicketPurchaseService.cancelUnpaid(ticket.id);
                    res.status(paymentResult.code).json(paymentResult);
                    return;
                }
                // `body` must be the flat ticket (same shape as the wallet
                // path) - the mobile client parses `body` directly as an
                // EventTicketPurchase. `payment` (payToken/status) rides
                // alongside at the top level.
                const fresh = await TicketRepository.findById(ticket.id);
                res.status(201).json({
                    status: true,
                    message: lang === 'en'
                        ? "Orange Money payment initiated - confirm on your phone"
                        : "Paiement Orange Money initié - confirmez sur votre téléphone",
                    body: fresh.body,
                    payment: paymentResult.body,
                    code: 201,
                });
                return;
            }

            // cash — guichet : billet en attente, place réservée.
            res.status(201).json(await TicketRepository.findById(ticket.id));
        } catch (error) {
            console.error('Purchase error:', error);
            res.status(500).json({ status: false, message: "Erreur lors de l'achat", code: 500 });
        }
    }

    private static notifyAdminSale(ticketId: number, paymentLabel: string) {
        TicketRepository.findForEmail(ticketId).then((t) => {
            if (!t) return;
            AdminNotificationService.notify({
                lang: (t.customer.preferred_language as Language) === 'en' ? 'en' : 'fr',
                icon: '🎟️',
                heading: { fr: "Nouveau billet vendu", en: "New ticket sold" },
                lines: [
                    [AdminLabel.customerName, t.customer.first_name],
                    [AdminLabel.customerEmail, t.customer.email || '-'],
                    [AdminLabel.event, t.event.title],
                    [AdminLabel.ticket, t.reference ?? String(t.id)],
                    [AdminLabel.quantity, String(t.quantity)],
                    [AdminLabel.amount, `${t.total_price} XAF`],
                    [AdminLabel.payment, paymentLabel],
                ],
            });
        }).catch(() => { /* logged in adminNotification.service */ });
    }

    static async confirmPayment(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const response = await TicketRepository.confirmPayment(id, req.body);
        if (response.status) {
            const ticket = response.body as { id: number; reference: string; customer_id: number; total_price: number };
            void TicketingNotifier.purchaseConfirmed(ticket.id);
            AdminNotificationService.notify({
                customerId: ticket.customer_id,
                icon: '💵',
                heading: { fr: "Paiement cash confirmé (billet)", en: "Cash payment confirmed (ticket)" },
                lines: [
                    [AdminLabel.ticket, ticket.reference],
                    [AdminLabel.customerId, String(ticket.customer_id)],
                    [AdminLabel.amount, `${ticket.total_price} XAF`],
                ],
            });
        }
        res.status(response.code).json(response);
    }

    /** Contrôle admin d'un billet par son id : fait entrer toutes les personnes restantes. */
    static async validate(req: Request, res: Response) {
        const ticket = await prismaDb.event_ticket.findFirst({
            where: { id: parseInt((req.params as { id: string }).id), is_deleted: false },
            select: { event_id: true, qr_code: true, quantity: true, checked_in_count: true },
        });
        if (!ticket?.qr_code) {
            res.status(404).json({ status: false, message: "Ticket non trouvé", code: 404 });
            return;
        }
        const result = await TicketScanService.admit(ticket.event_id, ticket.qr_code,
            Math.max(1, ticket.quantity - ticket.checked_in_count), { userId: req.userId });
        res.status(result.ok ? 200 : 400).json({ status: result.ok, message: result.message, body: result, code: result.ok ? 200 : 400 });
    }

    static async validateByQr(req: Request, res: Response) {
        const { qr_code } = req.body as { qr_code: string };
        const ticket = qr_code
            ? await prismaDb.event_ticket.findFirst({
                where: { qr_code, is_deleted: false },
                select: { event_id: true, quantity: true, checked_in_count: true },
            })
            : null;
        if (!ticket) {
            res.status(404).json({ status: false, message: "QR code invalide", code: 404 });
            return;
        }
        const result = await TicketScanService.admit(ticket.event_id, qr_code,
            Math.max(1, ticket.quantity - ticket.checked_in_count), { userId: req.userId });
        res.status(result.ok ? 200 : 400).json({ status: result.ok, message: result.message, body: result, code: result.ok ? 200 : 400 });
    }

    /**
     * Client : un billet non payé est annulé tout de suite ; un billet payé
     * fait l'objet d'une DEMANDE d'annulation (`reason` requis) qu'un admin
     * accepte ou refuse dans adigo2 (§3.2). Renvoie le billet à jour.
     */
    static async cancel(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        if (!isCustomerToken(req)) {
            res.status(400).json({ status: false, message: "Côté admin, utilisez le remboursement ou la décision sur la demande d'annulation", code: 400 });
            return;
        }
        const { reason } = (req.body ?? {}) as { reason?: string };
        const result = await TicketCancellationService.requestByCustomer(id, req.userId!, reason);
        if (result.ok === false) {
            res.status(result.code).json({ status: false, message: result.message, code: result.code });
            return;
        }
        const fresh = await TicketRepository.findById(id);
        res.status(200).json({ status: true, message: result.message, body: fresh.body, code: 200 });
    }
}
