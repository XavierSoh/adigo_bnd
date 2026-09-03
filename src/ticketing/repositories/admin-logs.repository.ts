// Migrated to Prisma's native model API (prisma.activity_log.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";

// `json_build_object(...)` selected an explicit column subset of
// `customer` per method (different subsets in each of the 3 original
// queries) — matched exactly below via per-call `select`.
const userSelectFull = { id: true, first_name: true, last_name: true, email: true, role: true } satisfies Prisma.customerSelect;
const userSelectLoginLogs = { id: true, email: true, role: true } satisfies Prisma.customerSelect;
const userSelectAudit = { id: true, first_name: true, last_name: true, role: true } satisfies Prisma.customerSelect;

function mapLog<T extends { customer: unknown }>(row: T) {
    const { customer, ...rest } = row;
    return { ...rest, user: customer };
}

export class AdminLogsRepository {

    static async getActivityLogs(limit: number, offset: number, actionType?: string, userId?: number) {
        const where: Prisma.activity_logWhereInput = {};
        if (actionType) where.action_type = actionType;
        if (userId) where.user_id = userId;

        const rows = await prismaDb.activity_log.findMany({
            where,
            include: { customer: { select: userSelectFull } },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
        });

        return rows.map(mapLog);
    }

    static async getLoginLogs(limit: number, offset: number) {
        const rows = await prismaDb.activity_log.findMany({
            where: { action_type: { in: ['login', 'logout', 'failed_login'] } },
            include: { customer: { select: userSelectLoginLogs } },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
        });

        return rows.map(mapLog);
    }

    static async getAuditTrail(entityType: string, entityId: number) {
        const rows = await prismaDb.activity_log.findMany({
            where: { entity_type: entityType, entity_id: entityId },
            include: { customer: { select: userSelectAudit } },
            orderBy: { created_at: 'desc' },
        });

        return rows.map(mapLog);
    }
}
