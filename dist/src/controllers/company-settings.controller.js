"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsController = void 0;
const company_settings_repository_1 = require("../repository/company-settings.repository");
/**
 * Controller for managing company settings
 */
class CompanySettingsController {
    /**
     * GET /company-settings
     * Get the company settings (singleton - always returns one record)
     */
    static async getSettings(req, res) {
        const response = await company_settings_repository_1.CompanySettingsRepository.getSettings();
        res.status(response.code || 500).json(response);
    }
    /**
     * PUT /company-settings
     * Update company settings
     * Admin-only route (should be protected by middleware)
     */
    static async updateSettings(req, res) {
        try {
            // Handle logo file upload if present (using multer or similar)
            const logoPath = req.file?.path;
            // Prepare update data
            const updateData = {
                ...req.body
            };
            // If a new logo was uploaded, include it
            if (logoPath) {
                updateData.logo_path = logoPath;
            }
            // Remove any undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });
            const response = await company_settings_repository_1.CompanySettingsRepository.updateSettings(updateData);
            res.status(response.code || 500).json(response);
        }
        catch (error) {
            console.error('Update company settings error:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la mise à jour des paramètres',
                exception: error instanceof Error ? error.message : error,
                code: 500
            });
        }
    }
}
exports.CompanySettingsController = CompanySettingsController;
