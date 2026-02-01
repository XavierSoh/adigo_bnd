import { Request, Response } from "express";
import { EventCategoryRepository } from "../repositories/event-category.repository";
import { EventCategoryCreateDto, EventCategoryUpdateDto } from "../models/event-category.model";
import { I18n } from "../../utils/i18n";

export class EventCategoryController {

    // Create event category
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const category = req.body;

            // Validate required fields
            if (!category.name_en || !category.name_fr) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('category_name_required', lang),
                    code: 400
                });
                return;
            }

            const result = await EventCategoryRepository.create(category);

            if (result.status) {
                result.message = I18n.t('category_created', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.create:', error);
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

            const result = await EventCategoryRepository.findById(id);

            if (!result.status) {
                result.message = I18n.t('category_not_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.getById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get all categories
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const { include_deleted, active_only } = req.query;

            const result = await EventCategoryRepository.findAll(
                include_deleted === 'true',
                active_only !== 'false' // Default true
            );

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.getAll:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update category
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const category: EventCategoryUpdateDto = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventCategoryRepository.update(id, category);

            if (result.status) {
                result.message = I18n.t('category_updated', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.update:', error);
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
            const result = await EventCategoryRepository.getStatistics();
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.getStatistics:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Reorder categories
    static async reorder(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { categories } = req.body;

            if (!Array.isArray(categories)) {
                res.status(400).json({
                    status: false,
                    message: 'Categories array is required',
                    code: 400
                });
                return;
            }

            const result = await EventCategoryRepository.reorder(categories);

            if (result.status) {
                result.message = I18n.t('categories_reordered', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.reorder:', error);
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
            const { deleted_by } = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventCategoryRepository.softDelete(id, deleted_by);

            if (result.status) {
                result.message = I18n.t('category_deleted', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.softDelete:', error);
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

            const result = await EventCategoryRepository.restore(id);

            if (result.status) {
                result.message = I18n.t('category_restored', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.restore:', error);
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

            const result = await EventCategoryRepository.delete(id);

            if (result.status) {
                result.message = I18n.t('category_deleted_permanently', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventCategoryController.delete:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
