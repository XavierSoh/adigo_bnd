/**
 * Event Ticket Purchase Controller
 *
 * Handles ticket purchases, payment, QR code generation, and validation
 */

import { Request, Response } from 'express';
import { EventTicketPurchaseRepository } from '../repositories/event-ticket-purchase.repository';
import { EventTicketPurchaseCreateDto } from '../models/event-ticket-purchase.model';
import { QRCodeService } from '../services/qrcode.service';
import { WalletRepository } from '../../repository/wallet.repository';
import { NotificationService } from '../../services/notification.service';
import { I18n } from '../../utils/i18n';

export class EventTicketPurchaseController {

    /**
     * Purchase tickets
     * POST /v1/api/ticketing/tickets/purchase
     */
    static async purchase(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const purchaseData: EventTicketPurchaseCreateDto = req.body;

            // Validate required fields
            if (!purchaseData.event_id || !purchaseData.ticket_type_id ||
                !purchaseData.customer_id || !purchaseData.quantity) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            // Step 1: Create purchase (pending status)
            const createResult = await EventTicketPurchaseRepository.create(purchaseData);

            if (!createResult.status) {
                res.status(createResult.code).json(createResult);
                return;
            }

            const ticket = createResult.body as any;

            // Step 2: Process payment (wallet only for MVP)
            if (purchaseData.payment_method === 'wallet') {
                const walletResult = await WalletRepository.recordPayment(
                    purchaseData.customer_id,
                    ticket.total_price,
                    `Tickets pour événement #${ticket.event_id}`
                );

                if (!walletResult.status) {
                    // Cancel ticket if payment fails
                    await EventTicketPurchaseRepository.cancel(
                        ticket.id,
                        'Paiement échoué - solde insuffisant'
                    );

                    res.status(walletResult.code).json({
                        status: false,
                        message: I18n.t('insufficient_wallet_balance', lang),
                        code: 400
                    });
                    return;
                }

                // Step 3: Generate QR code
                const validationToken = QRCodeService.generateValidationToken(
                    ticket.reference,
                    ticket.customer_id
                );

                const qrData = QRCodeService.generateQRCodeData({
                    ticket_reference: ticket.reference,
                    event_id: ticket.event_id,
                    customer_id: ticket.customer_id,
                    ticket_type_id: ticket.ticket_type_id,
                    purchase_id: ticket.id,
                    validation_token: validationToken
                });

                const qrImage = await QRCodeService.generateQRCodeImage(
                    qrData,
                    ticket.reference
                );

                // Step 4: Confirm payment and attach QR code
                const confirmResult = await EventTicketPurchaseRepository.confirmPayment(
                    ticket.id,
                    qrData,
                    qrImage,
                    (walletResult.body as any)?.transaction_id
                );

                if (!confirmResult.status) {
                    res.status(confirmResult.code).json(confirmResult);
                    return;
                }

                // Step 5: Send notification
                try {
                    // Get customer FCM token
                    const customer = await WalletRepository.getBalance(purchaseData.customer_id);

                    if ((customer.body as any)?.fcm_token) {
                        await NotificationService.sendToDevice(
                            (customer.body as any).fcm_token,
                            {
                                title: lang === 'fr' ? 'Ticket confirmé!' : 'Ticket confirmed!',
                                body: lang === 'fr'
                                    ? `Votre ticket pour l'événement est prêt`
                                    : `Your ticket is ready`,
                                data: {
                                    type: 'ticket_purchased',
                                    ticket_id: ticket.id.toString(),
                                    event_id: ticket.event_id.toString()
                                }
                            }
                        );
                    }
                } catch (notifError) {
                    console.error('Notification error:', notifError);
                    // Don't fail purchase if notification fails
                }

                res.status(200).json({
                    status: true,
                    message: I18n.t('ticket_purchase_success', lang),
                    body: confirmResult.body,
                    code: 200
                });
            } else {
                // Mobile Money not implemented in MVP
                res.status(501).json({
                    status: false,
                    message: 'Mobile Money payment not implemented yet. Use wallet.',
                    code: 501
                });
            }
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in purchase:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get customer tickets
     * GET /v1/api/ticketing/tickets/my-tickets
     */
    static async getMyTickets(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = (req as any).userId; // From auth middleware

            if (!customerId) {
                res.status(401).json({
                    status: false,
                    message: 'Unauthorized',
                    code: 401
                });
                return;
            }

            const filters = {
                status: req.query.status as string
            };

            const result = await EventTicketPurchaseRepository.findByCustomer(
                customerId,
                filters
            );

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getMyTickets:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get ticket by ID
     * GET /v1/api/ticketing/tickets/:id
     */
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const ticketId = parseInt(req.params.id);

            const result = await EventTicketPurchaseRepository.findById(ticketId);

            if (result.status) {
                result.message = I18n.t('ticket_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Validate ticket (scan QR code)
     * POST /v1/api/ticketing/tickets/validate
     */
    static async validateTicket(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { qr_code_data, ticket_reference } = req.body;
            const validatedBy = (req as any).userId;

            if (!ticket_reference && !qr_code_data) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            let ticketRef = ticket_reference;

            // If QR data provided, verify and extract
            if (qr_code_data) {
                const verification = QRCodeService.verifyQRCodeData(qr_code_data);

                if (!verification.valid) {
                    res.status(400).json({
                        status: false,
                        message: verification.error || 'Invalid QR code',
                        code: 400
                    });
                    return;
                }

                ticketRef = verification.data?.ticket_reference;
            }

            // Validate ticket
            const result = await EventTicketPurchaseRepository.validateTicket({
                ticket_reference: ticketRef,
                validated_by: validatedBy,
                validation_method: 'scanner_device'
            });

            if (result.status) {
                result.message = I18n.t('ticket_validated', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in validateTicket:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get tickets for an event (organizer view)
     * GET /v1/api/ticketing/tickets/event/:eventId
     */
    static async getEventTickets(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt(req.params.eventId);

            const result = await EventTicketPurchaseRepository.findByEvent(eventId);

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getEventTickets:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Cancel ticket
     * POST /v1/api/ticketing/tickets/:id/cancel
     */
    static async cancelTicket(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const ticketId = parseInt(req.params.id);
            const { reason } = req.body;

            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Cancellation reason required',
                    code: 400
                });
                return;
            }

            const result = await EventTicketPurchaseRepository.cancel(ticketId, reason);

            if (result.status) {
                result.message = I18n.t('ticket_cancelled', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in cancelTicket:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
