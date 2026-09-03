// Migrated to Prisma's native model API (prisma.company_settings.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
// tier 4 closure pass — this file wasn't in the tier-4 list but is needed
// to actually reach "zero $queryRawUnsafe outside the DDL files").
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { CompanySettingsModel, UpdateCompanySettingsDTO } from "../models/company-settings.model";
import ResponseModel from "../models/response.model";

// SCHEMA DISCREPANCY FLAGGED, not silently absorbed: `CompanySettingsModel`
// / `UpdateCompanySettingsDTO` declare 9 fields (tax_id,
// registration_number, business_license, city, country, postal_code, fax,
// support_hours, slogan) that DO NOT EXIST on the real `company_settings`
// table (confirmed against schema.prisma). The original's dynamic
// `SET ${key} = $n` query builder would have thrown a raw Postgres
// "column does not exist" error (falling to the generic 500 catch) the
// moment any caller actually sent one of those fields — a pre-existing,
// dormant bug, not something this conversion introduces. Prisma's typed
// update input makes it structurally impossible to even attempt setting a
// nonexistent column, so those 9 fields are filtered out here instead of
// reproduced as a runtime throw — the closest faithful behavior
// achievable within the native API (still errors were never useful; this
// makes an update with only phantom fields a 400 "no data" instead of a
// 500 "column does not exist").
const REAL_COLUMNS = [
    'company_name', 'address', 'phone', 'whatsapp', 'email', 'website',
    'facebook', 'twitter', 'instagram', 'logo_path', 'primary_color',
] as const;

export class CompanySettingsRepository {

    /**
     * Get the company settings (always returns the single row with id=1)
     */
    static async getSettings(): Promise<ResponseModel> {
        try {
            const settings = await prismaDb.company_settings.findUnique({ where: { id: 1 } });

            // If no settings exist, create default
            if (!settings) {
                console.log('No company settings found, creating defaults...');
                return await this.createDefaultSettings();
            }

            return {
                status: true,
                message: 'Paramètres récupérés avec succès',
                body: settings as unknown as CompanySettingsModel,
                code: 200
            };
        } catch (error) {
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
    static async updateSettings(data: UpdateCompanySettingsDTO): Promise<ResponseModel> {
        try {
            const updates: Prisma.company_settingsUpdateInput = {};
            for (const key of REAL_COLUMNS) {
                const value = (data as Record<string, unknown>)[key];
                if (value !== undefined) {
                    (updates as Record<string, unknown>)[key] = value;
                }
            }

            if (Object.keys(updates).length === 0) {
                return {
                    status: false,
                    message: 'Aucune donnée à mettre à jour',
                    code: 400
                };
            }

            let result;
            try {
                result = await prismaDb.company_settings.update({ where: { id: 1 }, data: updates });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    // If update failed because row doesn't exist, create default
                    return await this.createDefaultSettings();
                }
                throw error;
            }

            return {
                status: true,
                message: 'Paramètres mis à jour avec succès',
                body: result as unknown as CompanySettingsModel,
                code: 200
            };
        } catch (error) {
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
    private static async createDefaultSettings(): Promise<ResponseModel> {
        try {
            // `ON CONFLICT (id) DO NOTHING RETURNING *` — 0 rows back if the
            // row already exists, and the original's `pgOneOrNone` returns
            // null in that case (not an error). Reproduced exactly: still
            // reports success with a null body, not "fixed" into an error.
            let result: CompanySettingsModel | null;
            try {
                result = await prismaDb.company_settings.create({
                    data: {
                        id: 1,
                        company_name: 'ADIGO',
                        address: 'Douala, Cameroun',
                        phone: '+237 XXX XXX XXX',
                        whatsapp: '+237 XXX XXX XXX',
                        email: 'support@adigo.com',
                        website: 'https://www.adigo.com',
                        facebook: 'https://www.facebook.com/adigo',
                        twitter: 'https://twitter.com/adigo',
                        instagram: 'https://instagram.com/adigo',
                        logo_path: 'adigo_logo.png',
                        primary_color: '#D32F2F',
                    },
                }) as unknown as CompanySettingsModel;
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    result = null;
                } else {
                    throw error;
                }
            }

            return {
                status: true,
                message: 'Paramètres par défaut créés avec succès',
                body: result,
                code: 201
            };
        } catch (error) {
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
