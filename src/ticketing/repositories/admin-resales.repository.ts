// Migrated to Prisma's native model API (prisma.event_ticket_resale.*) —
// see BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
// tier 3).
import prismaDb from "../../config/prismaClient";

function mapResale<T extends { event_ticket: unknown; event: unknown; customer_event_ticket_resale_seller_idTocustomer: unknown }>(row: T) {
    const { event_ticket, event, customer_event_ticket_resale_seller_idTocustomer, ...rest } = row as any;
    return {
        ...rest,
        ticket: event_ticket ? { id: event_ticket.id, reference: event_ticket.reference, original_price: event_ticket.total_price } : null,
        event: event ? { id: event.id, title: event.title, event_code: event.code } : null,
        seller: customer_event_ticket_resale_seller_idTocustomer,
    };
}

export class AdminResalesRepository {

    static async findAll(limit: number, offset: number, status?: string) {
        // Frontend's filter dropdown sends 'available' for a listing
        // that's up for sale; the schema's real status value is 'listed'
        // (see BOOKING_MODULE_NOTES.md).
        const dbStatus = status === 'available' ? 'listed' : status;
        const where = { is_deleted: false, ...(dbStatus ? { status: dbStatus } : {}) };

        const [rows, total] = await Promise.all([
            prismaDb.event_ticket_resale.findMany({
                where,
                include: {
                    event_ticket: { select: { id: true, reference: true, total_price: true } },
                    event: { select: { id: true, title: true, code: true } },
                    customer_event_ticket_resale_seller_idTocustomer: { select: { id: true, first_name: true, last_name: true, email: true } },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prismaDb.event_ticket_resale.count({ where }),
        ]);

        return { resales: rows.map(mapResale), total };
    }

    static async getStats() {
        const where = { is_deleted: false } as const;
        // `COUNT(*) FILTER (WHERE ...)` per status — parallel `.count()`
        // calls; `AVG`/conditional `SUM` via `.aggregate()`.
        const [total, available, sold, cancelled, expired, priceAgg, soldRevenueAgg] = await Promise.all([
            prismaDb.event_ticket_resale.count({ where }),
            prismaDb.event_ticket_resale.count({ where: { ...where, status: 'listed' } }),
            prismaDb.event_ticket_resale.count({ where: { ...where, status: 'sold' } }),
            prismaDb.event_ticket_resale.count({ where: { ...where, status: 'cancelled' } }),
            prismaDb.event_ticket_resale.count({ where: { ...where, status: 'expired' } }),
            prismaDb.event_ticket_resale.aggregate({ where, _avg: { resale_price: true } }),
            prismaDb.event_ticket_resale.aggregate({ where: { ...where, status: 'sold' }, _sum: { resale_price: true } }),
        ]);

        return {
            total_resales: total,
            available_resales: available,
            sold_resales: sold,
            cancelled_resales: cancelled,
            expired_resales: expired,
            // `::int` cast on AVG in the original — Math.round reproduces
            // the rounding (Postgres's numeric AVG cast to int rounds too).
            average_resale_price: Math.round(priceAgg._avg.resale_price ?? 0),
            total_resale_revenue: soldRevenueAgg._sum.resale_price ?? 0,
        };
    }

    static async approve(id: number, adminId?: number) {
        return prismaDb.event_ticket_resale.update({
            where: { id },
            data: { status: 'listed', approved_by: adminId, approved_at: new Date() },
        });
    }

    static async reject(id: number, reason: string) {
        // No `cancelled_by` column exists on event_ticket_resale — only
        // cancellation_reason/cancelled_at.
        return prismaDb.event_ticket_resale.update({
            where: { id },
            data: { status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date() },
        });
    }

    static async softDelete(id: number, adminId?: number) {
        // No `deletion_reason` column exists on event_ticket_resale — a
        // given reason (if any) isn't persisted, matching what the schema
        // actually supports (handled by the controller not passing it here).
        return prismaDb.event_ticket_resale.update({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId },
        });
    }
}
