import { Request, Response } from "express";
import { CompanySettingsRepository } from "../repository/company-settings.repository";
import { UpdateCompanySettingsDTO } from "../models/company-settings.model";

/**
 * Controller for managing company settings
 */
export class CompanySettingsController {

    /**
     * GET /company-settings
     * Get the company settings (singleton - always returns one record)
     */
    static async getSettings(req: Request, res: Response) {
        const response = await CompanySettingsRepository.getSettings();
        res.status(response.code || 500).json(response);
    }

    /**
     * PUT /company-settings
     * Update company settings
     * Admin-only route (should be protected by middleware)
     */
    static async updateSettings(req: Request, res: Response) {
        try {
            // Handle logo file upload if present (using multer or similar)
            const logoPath = req.file?.path;

            // Prepare update data
            const updateData: UpdateCompanySettingsDTO = {
                ...req.body
            };

            // If a new logo was uploaded, include it
            if (logoPath) {
                updateData.logo_path = logoPath;
            }

            // Remove any undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key as keyof UpdateCompanySettingsDTO] === undefined) {
                    delete updateData[key as keyof UpdateCompanySettingsDTO];
                }
            });

            const response = await CompanySettingsRepository.updateSettings(updateData);
            res.status(response.code || 500).json(response);

        } catch (error) {
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
