"use strict";
/**
 * Admin Settings Controller
 *
 * System configuration and settings
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSettingsController = void 0;
const i18n_1 = require("../../utils/i18n");
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class AdminSettingsController {
    /**
     * Get all system settings
     * GET /v1/api/ticketing/admin/settings
     */
    static async getSettings(req, res) {
        try {
            const lang = req.lang || 'en';
            const settings = await pgdb_1.default.any(`
                SELECT * FROM system_settings
                WHERE is_deleted = FALSE
                ORDER BY category, setting_key
            `);
            // Group by category
            const grouped = settings.reduce((acc, setting) => {
                if (!acc[setting.category]) {
                    acc[setting.category] = {};
                }
                acc[setting.category][setting.setting_key] = {
                    value: setting.setting_value,
                    description: setting.description,
                    updated_at: setting.updated_at
                };
                return acc;
            }, {});
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('settings_retrieved', lang),
                body: grouped,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getSettings:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Update a setting
     * PUT /v1/api/ticketing/admin/settings/:key
     */
    static async updateSetting(req, res) {
        try {
            const lang = req.lang || 'en';
            const settingKey = req.params.key;
            const { value } = req.body;
            const adminId = req.userId;
            if (value === undefined) {
                res.status(400).json({
                    status: false,
                    message: 'Setting value required',
                    code: 400
                });
                return;
            }
            const updatedSetting = await pgdb_1.default.one(`
                UPDATE system_settings
                SET setting_value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
                WHERE setting_key = $1
                RETURNING *
            `, [settingKey, value, adminId]);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('setting_updated', lang),
                body: updatedSetting,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updateSetting:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get premium pricing settings
     * GET /v1/api/ticketing/admin/settings/pricing
     */
    static async getPricing(req, res) {
        try {
            const lang = req.lang || 'en';
            const pricing = await pgdb_1.default.any(`
                SELECT * FROM system_settings
                WHERE category = 'pricing'
                AND is_deleted = FALSE
            `);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('pricing_retrieved', lang),
                body: pricing,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPricing:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Update pricing
     * PUT /v1/api/ticketing/admin/settings/pricing
     */
    static async updatePricing(req, res) {
        try {
            const lang = req.lang || 'en';
            const { pricing_data } = req.body;
            const adminId = req.userId;
            // Update multiple pricing settings
            const updates = [];
            for (const [key, value] of Object.entries(pricing_data)) {
                updates.push(pgdb_1.default.none(`
                        UPDATE system_settings
                        SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
                        WHERE setting_key = $3 AND category = 'pricing'
                    `, [value, adminId, key]));
            }
            await Promise.all(updates);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('pricing_updated', lang),
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updatePricing:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.AdminSettingsController = AdminSettingsController;
