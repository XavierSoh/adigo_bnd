"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const TABLE_NAME = 'company_settings';
/**
 * Repository for managing company settings (singleton table)
 */
class CompanySettingsRepository {
    /**
     * Get the company settings (always returns the single row with id=1)
     */
    static async getSettings() {
        try {
            const settings = await pgdb_1.default.oneOrNone(`SELECT * FROM ${TABLE_NAME} WHERE id = 1`);
            // If no settings exist, create default
            if (!settings) {
                console.log('No company settings found, creating defaults...');
                return await this.createDefaultSettings();
            }
            return {
                status: true,
                message: 'Paramètres récupérés avec succès',
                body: settings,
                code: 200
            };
        }
        catch (error) {
            console.error(`Company settings get error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: 'Erreur lors de la récupération des paramètres',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }
    /**
     * Update company settings (updates the single row with id=1)
     */
    static async updateSettings(data) {
        try {
            // Build dynamic update query
            const updates = { ...data };
            // Remove undefined values
            Object.keys(updates).forEach(key => {
                if (updates[key] === undefined) {
                    delete updates[key];
                }
            });
            if (Object.keys(updates).length === 0) {
                return {
                    status: false,
                    message: 'Aucune donnée à mettre à jour',
                    code: 400
                };
            }
            // Build SET clause
            const setClauses = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`);
            const values = Object.values(updates);
            const query = `
                UPDATE ${TABLE_NAME}
                SET ${setClauses.join(', ')}
                WHERE id = 1
                RETURNING *
            `;
            const result = await pgdb_1.default.oneOrNone(query, values);
            if (!result) {
                // If update failed because row doesn't exist, create default
                return await this.createDefaultSettings();
            }
            return {
                status: true,
                message: 'Paramètres mis à jour avec succès',
                body: result,
                code: 200
            };
        }
        catch (error) {
            console.error(`Company settings update error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: 'Erreur lors de la mise à jour des paramètres',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }
    /**
     * Create default company settings (fallback if migration didn't run)
     */
    static async createDefaultSettings() {
        try {
            const result = await pgdb_1.default.oneOrNone(`INSERT INTO ${TABLE_NAME} (
                    id,
                    company_name,
                    address,
                    phone,
                    whatsapp,
                    email,
                    website,
                    facebook,
                    twitter,
                    instagram,
                    logo_path,
                    primary_color
                ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO NOTHING
                RETURNING *`, [
                'ADIGO',
                'Douala, Cameroun',
                '+237 XXX XXX XXX',
                '+237 XXX XXX XXX',
                'support@adigo.com',
                'https://www.adigo.com',
                'https://www.facebook.com/adigo',
                'https://twitter.com/adigo',
                'https://instagram.com/adigo',
                'adigo_logo.png',
                '#D32F2F'
            ]);
            return {
                status: true,
                message: 'Paramètres par défaut créés avec succès',
                body: result,
                code: 201
            };
        }
        catch (error) {
            console.error(`Company settings create error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: 'Erreur lors de la création des paramètres par défaut',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }
}
exports.CompanySettingsRepository = CompanySettingsRepository;
