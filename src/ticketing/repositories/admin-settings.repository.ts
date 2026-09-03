// Migrated to Prisma's native model API (prisma.system_settings.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import prismaDb from "../../config/prismaClient";

export class AdminSettingsRepository {

    static async getAllGrouped() {
        const settings = await prismaDb.system_settings.findMany({
            where: { is_deleted: false },
            orderBy: [{ category: 'asc' }, { setting_key: 'asc' }],
        });

        // Group by category. The desktop app's SystemSettings.fromJson
        // requires both "pricing" and "general" keys to be present (even if
        // empty) — seed both here rather than only including categories
        // that happen to have a setting yet.
        return settings.reduce((acc: any, setting) => {
            if (!acc[setting.category]) acc[setting.category] = {};
            acc[setting.category][setting.setting_key] = {
                value: setting.setting_value,
                description: setting.description,
                updated_at: setting.updated_at,
            };
            return acc;
        }, { pricing: {}, general: {} });
    }

    static async upsertSetting(category: string, settingKey: string, value: string, description: string | null, adminId?: number) {
        // system_settings starts out empty (no seeded rows) — an
        // UPDATE-only statement could never create the first value for any
        // key, so this upserts (matches the original's
        // `INSERT ... ON CONFLICT (category, setting_key) DO UPDATE`).
        return prismaDb.system_settings.upsert({
            where: { category_setting_key: { category, setting_key: settingKey } },
            create: { category, setting_key: settingKey, setting_value: value, description, updated_by: adminId, updated_at: new Date() },
            update: { setting_value: value, updated_by: adminId, updated_at: new Date() },
        });
    }

    static async getPricing() {
        return prismaDb.system_settings.findMany({
            where: { category: 'pricing', is_deleted: false },
        });
    }

    static async updatePricing(pricingData: Record<string, unknown>, adminId?: number) {
        // Original used `pgNone` per key — a silent no-op if no row with
        // that (category='pricing', setting_key) pair exists yet (an
        // UPDATE-only statement, unlike upsertSetting above). `updateMany`
        // reproduces that exactly: never creates, never throws on 0 rows.
        await Promise.all(
            Object.entries(pricingData).map(([key, value]) =>
                prismaDb.system_settings.updateMany({
                    where: { setting_key: key, category: 'pricing' },
                    data: { setting_value: String(value), updated_by: adminId, updated_at: new Date() },
                })
            )
        );
    }
}
