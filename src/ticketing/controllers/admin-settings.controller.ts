/**
 * Admin Settings Controller
 *
 * System configuration and settings
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminSettingsRepository (prisma.system_settings.*), see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { AdminSettingsRepository } from '../repositories/admin-settings.repository';

export class AdminSettingsController {

    /**
     * Get all system settings
     * GET /v1/api/ticketing/admin/settings
     */
    static async getSettings(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const grouped = await AdminSettingsRepository.getAllGrouped();

            res.status(200).json({
                status: true,
                message: I18n.t('settings_retrieved', lang),
                body: grouped,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getSettings:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Update a setting
     * PUT /v1/api/ticketing/admin/settings/:key
     */
    static async updateSetting(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const settingKey = (req.params as { key: string }).key;
            const { value, category, description } = req.body;
            const adminId = req.userId;

            if (value === undefined) {
                res.status(400).json({
                    status: false,
                    message: 'Setting value required',
                    code: 400
                });
                return;
            }

            const updatedSetting = await AdminSettingsRepository.upsertSetting(
                category || 'general',
                settingKey,
                value,
                description || null,
                adminId
            );

            res.status(200).json({
                status: true,
                message: I18n.t('setting_updated', lang),
                body: updatedSetting,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updateSetting:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get premium pricing settings
     * GET /v1/api/ticketing/admin/settings/pricing
     */
    static async getPricing(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const pricing = await AdminSettingsRepository.getPricing();

            res.status(200).json({
                status: true,
                message: I18n.t('pricing_retrieved', lang),
                body: pricing,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPricing:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Update pricing
     * PUT /v1/api/ticketing/admin/settings/pricing
     */
    static async updatePricing(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { pricing_data } = req.body;
            const adminId = req.userId;

            await AdminSettingsRepository.updatePricing(pricing_data, adminId);

            res.status(200).json({
                status: true,
                message: I18n.t('pricing_updated', lang),
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updatePricing:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
