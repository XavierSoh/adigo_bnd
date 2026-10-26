/**
 * Taux de commission Adigo sur les ventes de billets (§4.1) : un taux par
 * défaut (system_settings, catégorie 'ticketing'), surchargeable par
 * organisateur (event_organizer.commission_rate).
 */
import prismaDb from "../../config/prismaClient";

const SETTING = { category: 'ticketing', setting_key: 'default_commission_rate' } as const;
// Même valeur que la ligne créée par migrations/ticketing_admin_operated.sql —
// ne sert que si cette ligne a été supprimée à la main.
const FALLBACK_DEFAULT_RATE = 10;

function validRate(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

export class CommissionService {

    static async getDefaultRate(): Promise<number> {
        const row = await prismaDb.system_settings.findUnique({
            where: { category_setting_key: SETTING },
        });
        if (!row || row.is_deleted) return FALLBACK_DEFAULT_RATE;
        return validRate(row.setting_value) ?? FALLBACK_DEFAULT_RATE;
    }

    static async setDefaultRate(rate: number, adminId?: number): Promise<number> {
        const valid = validRate(rate);
        if (valid === null) throw new RangeError('Le taux doit être compris entre 0 et 100');
        await prismaDb.system_settings.upsert({
            where: { category_setting_key: SETTING },
            create: {
                ...SETTING,
                setting_value: String(valid),
                description: 'Taux de commission Adigo par défaut (%) sur les ventes de billets',
                updated_by: adminId ?? null,
                updated_at: new Date(),
            },
            update: { setting_value: String(valid), updated_by: adminId ?? null, updated_at: new Date(), is_deleted: false },
        });
        return valid;
    }

    /** Taux effectif d'un organisateur : le sien s'il est défini, sinon le taux par défaut. */
    static async rateForOrganizer(organizerId: number): Promise<number> {
        const org = await prismaDb.event_organizer.findUnique({
            where: { id: organizerId },
            select: { commission_rate: true },
        });
        const own = org?.commission_rate != null ? validRate(org.commission_rate) : null;
        return own ?? this.getDefaultRate();
    }

    /** Taux effectifs de plusieurs organisateurs en une requête (listes, bilans). */
    static async ratesForOrganizers(organizerIds: number[]): Promise<Map<number, number>> {
        const [defaultRate, orgs] = await Promise.all([
            this.getDefaultRate(),
            prismaDb.event_organizer.findMany({
                where: { id: { in: organizerIds } },
                select: { id: true, commission_rate: true },
            }),
        ]);
        const result = new Map<number, number>();
        for (const id of organizerIds) result.set(id, defaultRate);
        for (const o of orgs) {
            const own = o.commission_rate != null ? validRate(o.commission_rate) : null;
            if (own !== null) result.set(o.id, own);
        }
        return result;
    }
}
