// Migrated to Prisma's native model API (prisma.promo_code.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";

export class AdminPromoRepository {

    // SCHEMA DISCREPANCY FLAGGED, not silently resolved: `promo_code
    // .created_by`'s real FK target is `customer`, but this admin
    // endpoint passes `req.userId` — an admin/staff id from the auth
    // token, not necessarily a real `customer.id`. The original raw
    // INSERT would already hit the same FK constraint violation
    // (Postgres 23503) if the ids don't overlap, falling through to the
    // existing generic 500 (no special handling for it either) — Prisma's
    // `.create()` throws P2003 in the same situation, caught the same
    // generic way here. Reproduced as-is, not "fixed" to point elsewhere.
    static async create(data: {
        code: string; discount_type: string; discount_value: number;
        max_uses?: number; valid_from?: Date; valid_until?: Date;
        min_purchase_amount?: number; created_by?: number;
    }) {
        return prismaDb.promo_code.create({
            data: {
                code: data.code.toUpperCase(),
                discount_type: data.discount_type,
                discount_value: data.discount_value,
                max_uses: data.max_uses ?? null,
                valid_from: data.valid_from ?? null,
                valid_until: data.valid_until ?? null,
                min_purchase_amount: data.min_purchase_amount ?? 0,
                created_by: data.created_by,
            } as Prisma.promo_codeUncheckedCreateInput,
        });
    }

    static async findAll(status?: string, includeDeleted = false) {
        const where: Prisma.promo_codeWhereInput = {};
        if (!includeDeleted) where.is_deleted = false;

        if (status === 'active') {
            where.is_active = true;
            where.OR = [{ valid_until: null }, { valid_until: { gte: new Date() } }];
        } else if (status === 'expired') {
            where.valid_until = { lt: new Date() };
        } else if (status === 'inactive') {
            where.is_active = false;
        }

        return prismaDb.promo_code.findMany({ where, orderBy: { created_at: 'desc' } });
    }

    // Original had no existence check at all — a missing id's `pgOne`
    // throw fell straight through to the controller's generic 500.
    // `.update()`'s P2025 throw on a missing id reproduces that exactly
    // (no special catch added here either).
    static async update(id: number, data: {
        discount_type?: string; discount_value?: number; max_uses?: number;
        valid_from?: Date; valid_until?: Date; min_purchase_amount?: number; is_active?: boolean;
    }) {
        const updateData: Prisma.promo_codeUpdateInput = { updated_at: new Date() };
        if (data.discount_type != null) updateData.discount_type = data.discount_type;
        if (data.discount_value != null) updateData.discount_value = data.discount_value;
        if (data.max_uses != null) updateData.max_uses = data.max_uses;
        if (data.valid_from != null) updateData.valid_from = data.valid_from;
        if (data.valid_until != null) updateData.valid_until = data.valid_until;
        if (data.min_purchase_amount != null) updateData.min_purchase_amount = data.min_purchase_amount;
        if (data.is_active != null) updateData.is_active = data.is_active;

        return prismaDb.promo_code.update({ where: { id }, data: updateData });
    }

    static async softDelete(id: number, adminId?: number) {
        return prismaDb.promo_code.update({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId },
        });
    }

    static async getStats() {
        // `COUNT(*) FILTER (WHERE ...)` has no groupBy/aggregate
        // equivalent when the filters aren't a single GROUP BY column —
        // parallel `.count()` calls instead, `.aggregate()` for the SUM.
        const [total, active, expired, usesAgg] = await Promise.all([
            prismaDb.promo_code.count({ where: { is_deleted: false } }),
            prismaDb.promo_code.count({ where: { is_deleted: false, is_active: true } }),
            prismaDb.promo_code.count({ where: { is_deleted: false, valid_until: { lt: new Date() } } }),
            prismaDb.promo_code.aggregate({ where: { is_deleted: false }, _sum: { uses_count: true } }),
        ]);

        return {
            total_promo_codes: total,
            active_codes: active,
            expired_codes: expired,
            total_uses: usesAgg._sum.uses_count ?? 0,
        };
    }
}
