// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
import prismaDb from "../../config/prismaClient";

export class EventValidationRepository {

    static async getPendingEvents() {
        const rows = await prismaDb.event.findMany({
            where: { status: 'pending' },
            include: {
                event_organizer: { select: { id: true, name: true, email: true, phone: true, is_verified: true } },
                event_category: { select: { id: true, name: true, name_fr: true, name_en: true } },
            },
            orderBy: { created_at: 'asc' },
        });

        return rows.map((row) => {
            const { event_organizer, event_category, ...rest } = row;
            return { ...rest, organizer: event_organizer, category: event_category };
        });
    }

    static async approveEvent(id: number, adminId?: number) {
        return prismaDb.event.update({
            where: { id },
            data: {
                status: 'published',
                validation_status: 'approved',
                validated_by: adminId,
                validated_at: new Date(),
                published_at: new Date(),
                updated_at: new Date(),
            },
        });
    }

    static async rejectEvent(id: number, adminId: number | undefined, reason: string) {
        // event has no rejection_reason column of its own (that field only
        // exists on event_organizer) — validation_notes covers both
        // approve and reject notes here.
        return prismaDb.event.update({
            where: { id },
            data: {
                status: 'draft',
                validation_status: 'rejected',
                validated_by: adminId,
                validated_at: new Date(),
                validation_notes: reason,
                updated_at: new Date(),
            },
        });
    }

    static async getPendingOrganizers() {
        return prismaDb.event_organizer.findMany({
            where: { verification_status: 'pending', is_deleted: false },
            include: { customer: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } } },
            orderBy: { created_at: 'asc' },
        });
    }

    static async verifyOrganizer(id: number, status: 'verified' | 'rejected', adminId?: number, reason?: string) {
        return prismaDb.event_organizer.update({
            where: { id },
            data: {
                verification_status: status,
                is_verified: status === 'verified',
                verified_by: adminId,
                verified_at: new Date(),
                rejection_reason: reason || null,
                updated_at: new Date(),
            },
        });
    }

    static async getEventsStats() {
        const where = { is_deleted: false } as const;

        // `COUNT(DISTINCT e.id) FILTER (WHERE ...)` per status/flag —
        // parallel `.count()` calls; pricing/inventory lives on
        // event_ticket_type (tiers), not on event itself — SUM across the
        // relation via `.aggregate()` instead of reading removed flat
        // columns (see BOOKING_MODULE_NOTES.md).
        const [total, pending, published, cancelled, ticketTypeAgg, withDesign, withBoost] = await Promise.all([
            prismaDb.event.count({ where }),
            prismaDb.event.count({ where: { ...where, status: 'pending' } }),
            prismaDb.event.count({ where: { ...where, status: 'published' } }),
            prismaDb.event.count({ where: { ...where, status: 'cancelled' } }),
            prismaDb.event_ticket_type.aggregate({ where: { event: where }, _sum: { quantity: true, sold: true } }),
            prismaDb.event.count({ where: { ...where, has_premium_design: true } }),
            prismaDb.event.count({ where: { ...where, has_boost: true } }),
        ]);

        return {
            total_events: total,
            pending_events: pending,
            published_events: published,
            cancelled_events: cancelled,
            total_tickets_across_all: ticketTypeAgg._sum.quantity ?? 0,
            total_tickets_sold: ticketTypeAgg._sum.sold ?? 0,
            events_with_premium_design: withDesign,
            events_with_boost: withBoost,
        };
    }
}
