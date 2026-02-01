import { UpdateCompanySettingsDTO } from "../models/company-settings.model";
import ResponseModel from "../models/response.model";
/**
 * Repository for managing company settings (singleton table)
 */
export declare class CompanySettingsRepository {
    /**
     * Get the company settings (always returns the single row with id=1)
     */
    static getSettings(): Promise<ResponseModel>;
    /**
     * Update company settings (updates the single row with id=1)
     */
    static updateSettings(data: UpdateCompanySettingsDTO): Promise<ResponseModel>;
    /**
     * Create default company settings (fallback if migration didn't run)
     */
    private static createDefaultSettings;
}
