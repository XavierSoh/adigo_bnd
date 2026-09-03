import { Request, Response } from "express";
import { TicketRepository } from "../../repository/ticketing/ticket.repository";
import { TicketTypeRepository } from "../../repository/ticketing/ticket-type.repository";
import { CustomerRepository } from "../../repository/customer.repository";
import { WalletRepository } from "../../repository/wallet.repository";
import { PaymentService } from "../../services/payment/payment.service";
import { sendEmail } from "../../services/email.service";
import { ticketPurchaseConfirmedEmail } from "../../emails/templates";
import { Language } from "../../utils/i18n";
import { TicketPurchaseDto } from "../../models/ticketing";

export class TicketController {

    static async getMyTickets(req: Request, res: Response) {
        const { customerId } = req.params as { customerId: string };
        const response = await TicketRepository.findByCustomerId(parseInt(customerId));
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.findById(parseInt(id));
        if (response.status) {
            const ticket = response.body as { customer_id: number };
            if (!req.userRole && req.userId !== ticket.customer_id) {
                res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
                return;
            }
        }
        res.status(response.code).json(response);
    }

    static async getByReference(req: Request, res: Response) {
        const { reference } = req.params as { reference: string };
        const response = await TicketRepository.findByReference(reference);
        if (response.status) {
            const ticket = response.body as { customer_id: number };
            if (!req.userRole && req.userId !== ticket.customer_id) {
                res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
                return;
            }
        }
        res.status(response.code).json(response);
    }

    // Payment orchestration lives here, not in the repository - mirrors
    // BookingController.create/createMultiple's split exactly. The
    // repository only does plain DB reads/writes.
    static async purchase(req: Request, res: Response) {
        const lang: Language = req.lang || 'fr';
        try {
            const data = req.body as TicketPurchaseDto;
            const { event_id, ticket_type_id, customer_id, quantity, payment_method, subscriber_msisdn } = data;

            if (!event_id || !ticket_type_id || !customer_id || !quantity || !payment_method) {
                res.status(400).json({
                    status: false,
                    message: "event_id, ticket_type_id, customer_id, quantity et payment_method sont requis",
                    code: 400,
                });
                return;
            }

            // A customer token may only purchase for itself; a staff/admin
            // token (has a role) may purchase on behalf of any customer_id
            // (e.g. box-office sale from the desktop admin) - same pattern
            // as BookingController.create/createMultiple.
            if (!req.userRole && req.userId !== Number(customer_id)) {
                res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
                return;
            }

            if (payment_method === 'mtn') {
                res.status(400).json({
                    status: false,
                    message: "MTN Mobile Money n'est pas encore disponible. Utilisez le portefeuille, Orange Money ou l'espèce.",
                    code: 400,
                });
                return;
            }

            const availability = await TicketTypeRepository.validateAvailability(ticket_type_id, quantity);
            if (!availability.status) {
                res.status(availability.code).json(availability);
                return;
            }
            const ticketType = availability.body as { price: number };
            const unitPrice = ticketType.price;
            const totalPrice = unitPrice * quantity;

            if (payment_method === 'wallet') {
                const balanceCheck = await CustomerRepository.getWalletBalance(customer_id);
                if (!balanceCheck.status) {
                    res.status(balanceCheck.code).json(balanceCheck);
                    return;
                }
                const { balance } = balanceCheck.body as { balance: number };
                if (balance < totalPrice) {
                    res.status(400).json({
                        status: false,
                        message: `Solde du portefeuille insuffisant (disponible: ${balance}, requis: ${totalPrice})`,
                        code: 400,
                    });
                    return;
                }

                const created = await TicketRepository.createPending(data, unitPrice, totalPrice, 'confirmed', 'pending');
                if (!created.status) {
                    res.status(created.code).json(created);
                    return;
                }
                const ticket = created.body as { id: number; ticket_type_id: number; quantity: number; reference: string };

                const paymentResult = await WalletRepository.recordPayment(
                    customer_id,
                    totalPrice,
                    `Achat ticket - ${ticket.reference}`
                );
                if (!paymentResult.status) {
                    // Balance was fine moments ago but the debit itself
                    // failed (race with another concurrent charge) - undo
                    // the ticket rather than leave it confirmed unpaid.
                    await TicketRepository.softDeleteFailed(ticket.id);
                    res.status(400).json({
                        status: false,
                        message: paymentResult.message || "Solde du portefeuille insuffisant",
                        code: 400,
                    });
                    return;
                }

                await TicketRepository.markWalletPaid(ticket.id, `wallet-${ticket.reference}`);
                await TicketTypeRepository.incrementSold(ticket.ticket_type_id, ticket.quantity);
                TicketController.sendConfirmationEmail(ticket.id, lang).catch(() => { /* logged in email.service */ });

                const finalTicket = await TicketRepository.findById(ticket.id);
                res.status(201).json(finalTicket);
                return;
            }

            if (payment_method === 'orangeMoney') {
                if (!subscriber_msisdn) {
                    res.status(400).json({
                        status: false,
                        message: "subscriber_msisdn est requis pour un paiement Orange Money",
                        code: 400,
                    });
                    return;
                }

                const created = await TicketRepository.createPending(data, unitPrice, totalPrice, 'pending', 'pending');
                if (!created.status) {
                    res.status(created.code).json(created);
                    return;
                }
                const ticket = created.body as { id: number; reference: string };

                const paymentResult = await PaymentService.initiate({
                    customerId: customer_id,
                    purpose: 'ticket_purchase',
                    purposeRefId: ticket.id,
                    subscriberMsisdn: subscriber_msisdn,
                    amount: totalPrice,
                    description: `Achat ticket - ${ticket.reference}`,
                });

                if (!paymentResult.status) {
                    await TicketRepository.markCancelled(ticket.id);
                    res.status(paymentResult.code).json(paymentResult);
                    return;
                }

                res.status(201).json({
                    status: true,
                    message: "Paiement Orange Money initié - confirmez sur votre téléphone",
                    body: { ticket, payment: paymentResult.body },
                    code: 201,
                });
                return;
            }

            // cash - created pending, confirmed later via confirmPayment (admin only)
            const created = await TicketRepository.createPending(data, unitPrice, totalPrice, 'pending', 'pending');
            res.status(created.code).json(created);
        } catch (error) {
            console.error('Purchase error:', error);
            res.status(500).json({ status: false, message: "Erreur lors de l'achat", code: 500 });
        }
    }

    // Shared by the wallet-immediate-success path here and by
    // ticket.settlement.ts's Orange-Money-webhook success path.
    static async sendConfirmationEmail(ticketId: number, fallbackLang: Language): Promise<void> {
        const ticket = await TicketRepository.findForEmail(ticketId);
        if (!ticket?.customer?.email) return;

        const lang = (ticket.customer.preferred_language as Language) || fallbackLang;
        const { subject, html, text } = ticketPurchaseConfirmedEmail(lang, {
            firstName: ticket.customer.first_name,
            eventTitle: ticket.event.title,
            quantity: ticket.quantity,
            totalPrice: ticket.total_price,
            reference: ticket.reference || String(ticket.id),
        });
        await sendEmail({ to: ticket.customer.email, subject, html, text });
    }

    static async confirmPayment(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.confirmPayment(parseInt(id), req.body);
        res.status(response.code).json(response);
    }

    static async validate(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.validate(parseInt(id));
        res.status(response.code).json(response);
    }

    static async validateByQr(req: Request, res: Response) {
        const { qr_code } = req.body as { qr_code: string };
        const response = await TicketRepository.validateByQr(qr_code);
        res.status(response.code).json(response);
    }

    static async cancel(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const existing = await TicketRepository.findById(parseInt(id));
        if (existing.status) {
            const ticket = existing.body as { customer_id: number };
            if (!req.userRole && req.userId !== ticket.customer_id) {
                res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
                return;
            }
        }
        const response = await TicketRepository.cancel(parseInt(id));
        res.status(response.code).json(response);
    }
}
