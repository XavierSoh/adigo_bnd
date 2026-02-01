import { Request, Response } from "express";
import { EventOrganizerRepository } from "../repositories/event-organizer.repository";
import { EventOrganizerCreateDto, EventOrganizerUpdateDto } from "../models/event-organizer.model";
import { I18n } from "../../utils/i18n";

export class EventOrganizerController {

    // Create organizer profile
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizer: EventOrganizerCreateDto = req.body;
            const created_by = (req as any).userId; // From auth middleware

            // Validate required fields
            if (!organizer.customer_id || !organizer.organization_name) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            const result = await EventOrganizerRepository.create(organizer, created_by);

            if (result.status) {
                result.message = I18n.t('organizer_created', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.create:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by customer ID
    static async getByCustomerId(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventOrganizerRepository.findByCustomerId(customerId);

            if (!result.status) {
                result.message = I18n.t('organizer_not_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getByCustomerId:', error);
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

            const result = await EventOrganizerRepository.findById(id);

            if (!result.status) {
                result.message = I18n.t('organizer_not_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get all organizers
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const { include_deleted } = req.query;

            const result = await EventOrganizerRepository.findAll(include_deleted === 'true');
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getAll:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update organizer
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const organizer: EventOrganizerUpdateDto = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventOrganizerRepository.update(id, organizer);

            if (result.status) {
                result.message = I18n.t('organizer_updated', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.update:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update verification status (Admin only)
    static async updateVerificationStatus(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { status, verification_notes } = req.body;
            const verified_by = (req as any).userId; // From auth middleware

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            if (!status || !['pending', 'verified', 'rejected', 'suspended'].includes(status)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid verification status',
                    code: 400
                });
                return;
            }

            const result = await EventOrganizerRepository.updateVerificationStatus(
                id,
                status,
                verified_by,
                verification_notes
            );

            if (result.status) {
                result.message = I18n.t('verification_status_updated', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.updateVerificationStatus:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Search organizers
    static async search(req: Request, res: Response): Promise<void> {
        try {
            const {
                q,
                verification_status,
                organization_type
            } = req.query;

            const filters: any = {};

            if (q && typeof q === 'string') {
                filters.searchTerm = q;
            }

            if (verification_status && typeof verification_status === 'string') {
                filters.verificationStatus = verification_status;
            }

            if (organization_type && typeof organization_type === 'string') {
                filters.organizationType = organization_type;
            }

            const result = await EventOrganizerRepository.search(filters);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.search:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get verified organizers
    static async getVerified(req: Request, res: Response): Promise<void> {
        try {
            const result = await EventOrganizerRepository.getVerified();
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getVerified:', error);
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
            const result = await EventOrganizerRepository.getStatistics();
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getStatistics:', error);
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

            const result = await EventOrganizerRepository.softDelete(id, deleted_by);

            if (result.status) {
                result.message = I18n.t('organizer_deleted', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.softDelete:', error);
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

            const result = await EventOrganizerRepository.restore(id);

            if (result.status) {
                result.message = I18n.t('organizer_restored', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.restore:', error);
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

            const result = await EventOrganizerRepository.delete(id);

            if (result.status) {
                result.message = I18n.t('organizer_deleted_permanently', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.delete:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
