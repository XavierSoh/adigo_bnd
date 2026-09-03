/**
 * Registers the Orange Money settlement handler for ticket purchases.
 * Mirrors exactly what EventTicketPurchaseController.purchase() already
 * does for the wallet path (steps 3-4 in that method): generate the QR
 * code and confirm payment — just triggered asynchronously once Orange
 * Money confirms the customer approved the charge, instead of synchronously.
 */

import { registerSettlementHandler } from "../../services/payment/payment-settlement.registry";
import { EventTicketPurchaseRepository } from "../repositories/event-ticket-purchase.repository";
import { QRCodeService } from "./qrcode.service";

registerSettlementHandler('ticket_purchase', async (transaction) => {
    if (!transaction.purpose_ref_id) {
        console.error(`⚠️ ticket_purchase settlement: no purpose_ref_id on transaction ${transaction.id}`);
        return;
    }

    const ticketResult = await EventTicketPurchaseRepository.findById(transaction.purpose_ref_id);
    if (!ticketResult.status) {
        console.error(
            `⚠️ ticket_purchase settlement: ticket ${transaction.purpose_ref_id} not found`,
            ticketResult.message
        );
        return;
    }
    const ticket = ticketResult.body as any;

    const validationToken = QRCodeService.generateValidationToken(ticket.reference, ticket.customer_id);
    const qrData = QRCodeService.generateQRCodeData({
        ticket_reference: ticket.reference,
        event_id: ticket.event_id,
        customer_id: ticket.customer_id,
        ticket_type_id: ticket.ticket_type_id,
        purchase_id: ticket.id,
        validation_token: validationToken,
    });
    const qrImage = await QRCodeService.generateQRCodeImage(qrData, ticket.reference);

    const confirmResult = await EventTicketPurchaseRepository.confirmPayment(
        ticket.id,
        qrData,
        qrImage,
        undefined
    );

    if (!confirmResult.status) {
        console.error(
            `⚠️ ticket_purchase settlement: confirmPayment failed for ticket ${ticket.id}:`,
            confirmResult.message
        );
    }
});
