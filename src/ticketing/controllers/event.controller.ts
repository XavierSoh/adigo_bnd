import { Request, Response } from "express";
import { EventRepository } from "../repositories/event.repository";
import { EventTicketTypeRepository } from "../repositories/event-ticket-type.repository";
import { CustomerRepository } from "../../repository/customer.repository";
import { EventCreateDto, EventUpdateDto, EventPublishDto, EventSearchParams } from "../models/event.model";
import { I18n } from "../../utils/i18n";
import { PremiumPaymentService, PremiumServicesRequest } from "../services/premium-payment.service";
import { PremiumDesignService } from "../services/premium-design.service";

export class EventController {

    // Create event
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const event: EventCreateDto = req.body;
            const created_by = (req as any).userId; // From auth middleware

            // Validate required fields
            if (!event.title || !event.category_id || !event.organizer_id ||
                !event.event_date || !event.venue_name || !event.city) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.create(event, created_by);

            if (result.status) {
                result.message = I18n.t('event_created', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.create:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by ID
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.findById(id);

            if (!result.status) {
                result.message = I18n.t('event_not_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by event code
    static async getByEventCode(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { eventCode } = req.params;

            const result = await EventRepository.findByEventCode(eventCode);

            if (!result.status) {
                result.message = I18n.t('event_not_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getByEventCode:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get all events
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const { include_deleted } = req.query;

            const result = await EventRepository.findAll(include_deleted === 'true');
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getAll:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by organizer
    static async getByOrganizer(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt(req.params.organizerId);

            if (isNaN(organizerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.findByOrganizer(organizerId);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getByOrganizer:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by category
    static async getByCategory(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const categoryId = parseInt(req.params.categoryId);

            if (isNaN(categoryId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.findByCategory(categoryId);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getByCategory:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update event
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const event: EventUpdateDto = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.update(id, event);

            if (result.status) {
                result.message = I18n.t('event_updated', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.update:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Publish event (with premium services payment via wallet)
    static async publish(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const premiumServicesData = req.body;
            const organizerId = (req as any).userId;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            // Get event and organizer info
            const eventResult = await EventRepository.findById(id);
            if (!eventResult.status) {
                res.status(404).json(eventResult);
                return;
            }

            const event = eventResult.body as any;
            const customerId = event.organizer?.customer_id;

            if (!customerId) {
                res.status(400).json({
                    status: false,
                    message: 'Organizer customer not found',
                    code: 400
                });
                return;
            }

            // MANDATORY: Check premium design requirement
            const designValidation = await PremiumDesignService.validateDesignRequirement(id);

            if (!designValidation.canPublish) {
                res.status(400).json({
                    status: false,
                    message: designValidation.message || 'Premium design payment required before publishing',
                    body: {
                        required_amount: designValidation.amount,
                        design_paid: designValidation.paid
                    },
                    code: 400
                });
                return;
            }

            // Build premium services request
            const request: PremiumServicesRequest = {
                eventId: id,
                customerId: customerId,
                designRequired: true,

                // Visibility boost (optional)
                boostHomepage: premiumServicesData.boostHomepage || false,
                boostCategory: premiumServicesData.boostCategory || false,
                boostDurationDays: premiumServicesData.boostDurationDays || undefined,

                // Field service (optional)
                fieldServiceAgents: premiumServicesData.fieldServiceAgents || undefined,
                fieldServiceScanners: premiumServicesData.fieldServiceScanners || undefined,
                fieldServiceDays: premiumServicesData.fieldServiceDays || 1,

                // Marketing (optional)
                marketingPosterBasic: premiumServicesData.marketingPosterBasic || false,
                marketingPosterPremium: premiumServicesData.marketingPosterPremium || false,
                marketingAdsEnabled: premiumServicesData.marketingAdsEnabled || false,
                marketingAdsBudget: premiumServicesData.marketingAdsBudget || undefined,

                // SMS (optional)
                smsNotifications: premiumServicesData.smsNotifications || undefined
            };

            // Calculate total cost
            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            // Check wallet balance
            const balanceCheck = await CustomerRepository.getWalletBalance(customerId);
            if (!balanceCheck.status) {
                res.status(balanceCheck.code).json(balanceCheck);
                return;
            }

            const currentBalance = (balanceCheck.body as any).balance || 0;

            if (currentBalance < breakdown.total) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('insufficient_wallet_balance', lang),
                    body: {
                        required: breakdown.total,
                        current_balance: currentBalance,
                        breakdown: breakdown
                    },
                    code: 400
                });
                return;
            }

            // Process payment
            const payment = await PremiumPaymentService.processWalletPayment(
                customerId,
                breakdown.total,
                `Premium services for event ${event.event_code}`,
                id
            );

            if (!payment.success) {
                res.status(400).json({
                    status: false,
                    message: payment.error || 'Payment failed',
                    code: 400
                });
                return;
            }

            // Apply all premium services to event
            const servicesApplied = await PremiumPaymentService.applyPremiumServices(request, breakdown);

            if (!servicesApplied) {
                // Rollback payment if services application failed
                // (In production, implement proper transaction rollback)
                console.error('❌ Failed to apply premium services after payment');
            }

            // Publish event
            const publishData: EventPublishDto = {
                has_premium_design: true,
                premium_design_amount: breakdown.design
            };

            const result = await EventRepository.publish(id, publishData);

            if (result.status) {
                result.message = I18n.t('event_published', lang);
                result.body = {
                    ...result.body,
                    premium_services: breakdown
                };
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.publish:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Approve event (Admin only)
    static async approve(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { validation_notes } = req.body;
            const validated_by = (req as any).userId;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.approve(id, validated_by, validation_notes);

            if (result.status) {
                result.message = I18n.t('event_approved', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.approve:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Reject event (Admin only)
    static async reject(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { validation_notes } = req.body;
            const validated_by = (req as any).userId;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            if (!validation_notes) {
                res.status(400).json({
                    status: false,
                    message: 'Rejection reason is required',
                    code: 400
                });
                return;
            }

            const result = await EventRepository.reject(id, validated_by, validation_notes);

            if (result.status) {
                result.message = I18n.t('event_rejected', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.reject:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Cancel event
    static async cancel(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { cancellation_reason } = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            if (!cancellation_reason) {
                res.status(400).json({
                    status: false,
                    message: 'Cancellation reason is required',
                    code: 400
                });
                return;
            }

            const result = await EventRepository.cancel(id, cancellation_reason);

            if (result.status) {
                result.message = I18n.t('event_cancelled', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.cancel:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Search events
    static async search(req: Request, res: Response): Promise<void> {
        try {
            const {
                q,
                category_id,
                city,
                status,
                start_date,
                end_date,
                min_price,
                max_price,
                organizer_id,
                has_available_tickets,
                is_featured,
                sort_by,
                sort_order,
                limit,
                offset
            } = req.query;

            const params: EventSearchParams = {};

            if (q && typeof q === 'string') {
                params.searchTerm = q;
            }

            if (category_id) {
                params.categoryId = parseInt(category_id as string);
            }

            if (city && typeof city === 'string') {
                params.city = city;
            }

            if (status && typeof status === 'string') {
                params.status = status as any;
            }

            if (start_date) {
                params.startDate = new Date(start_date as string);
            }

            if (end_date) {
                params.endDate = new Date(end_date as string);
            }

            if (min_price) {
                params.minPrice = parseFloat(min_price as string);
            }

            if (max_price) {
                params.maxPrice = parseFloat(max_price as string);
            }

            if (organizer_id) {
                params.organizerId = parseInt(organizer_id as string);
            }

            if (has_available_tickets !== undefined) {
                params.hasAvailableTickets = has_available_tickets === 'true';
            }

            if (is_featured !== undefined) {
                params.isFeatured = is_featured === 'true';
            }

            if (sort_by && typeof sort_by === 'string') {
                params.sortBy = sort_by;
            }

            if (sort_order && typeof sort_order === 'string') {
                params.sortOrder = sort_order as 'ASC' | 'DESC';
            }

            if (limit) {
                params.limit = parseInt(limit as string);
            }

            if (offset) {
                params.offset = parseInt(offset as string);
            }

            const result = await EventRepository.search(params);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.search:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get upcoming events
    static async getUpcoming(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit as string) : 10;

            const result = await EventRepository.getUpcoming(limitNum);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getUpcoming:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get past events
    static async getPast(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit as string) : 10;

            const result = await EventRepository.getPast(limitNum);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getPast:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get featured events
    static async getFeatured(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit as string) : 5;

            const result = await EventRepository.getFeatured(limitNum);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getFeatured:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get popular events
    static async getPopular(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit as string) : 10;

            const result = await EventRepository.getPopular(limitNum);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getPopular:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get statistics
    static async getStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { organizer_id } = req.query;
            const organizerId = organizer_id ? parseInt(organizer_id as string) : undefined;

            const result = await EventRepository.getStatistics(organizerId);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getStatistics:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get event with ticket types
    static async getEventWithTickets(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const eventResult = await EventRepository.findById(id);
            if (!eventResult.status) {
                res.status(eventResult.code).json(eventResult);
                return;
            }

            const ticketTypesResult = await EventTicketTypeRepository.findByEventId(id, true);

            res.status(200).json({
                status: true,
                message: 'Event with ticket types retrieved',
                body: {
                    event: eventResult.body,
                    ticket_types: ticketTypesResult.body
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getEventWithTickets:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Soft delete
    static async softDelete(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const deleted_by = (req as any).userId;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.softDelete(id, deleted_by);

            if (result.status) {
                result.message = I18n.t('event_deleted', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.softDelete:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Restore
    static async restore(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.restore(id);

            if (result.status) {
                result.message = I18n.t('event_restored', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.restore:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Hard delete
    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventRepository.delete(id);

            if (result.status) {
                result.message = I18n.t('event_deleted_permanently', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.delete:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
