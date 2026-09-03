// Migrated to Prisma's native model API (prisma.event_review.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";

function mapReview<T extends { event: unknown; customer: unknown }>(row: T) {
    const { event, customer, ...rest } = row as any;
    return {
        ...rest,
        event: event ? { id: event.id, title: event.title, ...(('code' in event) ? { event_code: event.code } : {}) } : null,
        customer,
    };
}

export class AdminReviewsRepository {

    static async findAll(limit: number, offset: number, eventId?: number, rating?: number) {
        const where: Prisma.event_reviewWhereInput = { is_deleted: false };
        if (eventId) where.event_id = eventId;
        if (rating) where.rating = rating;

        const [rows, total] = await Promise.all([
            prismaDb.event_review.findMany({
                where,
                include: {
                    event: { select: { id: true, title: true, code: true } },
                    customer: { select: { id: true, first_name: true, last_name: true, email: true } },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prismaDb.event_review.count({ where }),
        ]);

        return { reviews: rows.map(mapReview), total };
    }

    static async findFlagged() {
        const rows = await prismaDb.event_review.findMany({
            where: { is_deleted: false, is_flagged: true },
            include: {
                event: { select: { id: true, title: true } },
                customer: { select: { id: true, first_name: true, last_name: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        return rows.map(mapReview);
    }

    static async flag(id: number, reason: string, adminId?: number) {
        return prismaDb.event_review.update({
            where: { id },
            data: { is_flagged: true, flag_reason: reason, flagged_by: adminId, flagged_at: new Date() },
        });
    }

    static async unflag(id: number) {
        return prismaDb.event_review.update({
            where: { id },
            data: { is_flagged: false, flag_reason: null, flagged_by: null, flagged_at: null },
        });
    }

    static async softDelete(id: number, adminId?: number) {
        // No `deletion_reason` column exists on event_review — a given
        // reason (if any) isn't persisted, matching what the schema
        // actually supports.
        return prismaDb.event_review.update({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId },
        });
    }

    static async getStats() {
        const where = { is_deleted: false } as const;

        // `COUNT(*) FILTER (WHERE rating = N)` per star rating — parallel
        // `.count()` calls; `AVG` via `.aggregate()`.
        const [total, flagged, ratingAgg, five, four, three, two, one] = await Promise.all([
            prismaDb.event_review.count({ where }),
            prismaDb.event_review.count({ where: { ...where, is_flagged: true } }),
            prismaDb.event_review.aggregate({ where, _avg: { rating: true } }),
            prismaDb.event_review.count({ where: { ...where, rating: 5 } }),
            prismaDb.event_review.count({ where: { ...where, rating: 4 } }),
            prismaDb.event_review.count({ where: { ...where, rating: 3 } }),
            prismaDb.event_review.count({ where: { ...where, rating: 2 } }),
            prismaDb.event_review.count({ where: { ...where, rating: 1 } }),
        ]);

        // `created_at >= CURRENT_DATE - INTERVAL '7 days'` — CURRENT_DATE
        // depends on Postgres's session TimeZone GUC (seen as
        // Europe/Paris, not Douala's), which can disagree with the Node
        // process's own local midnight by up to an hour around DST
        // boundaries. Flagged, not silently declared identical: this uses
        // the Node process's local midnight instead, consistent with how
        // every other "local" boundary in this migration is computed.
        const now = new Date();
        const todayMidnightLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(todayMidnightLocal.getTime() - 7 * 24 * 60 * 60 * 1000);
        const reviewsLast7Days = await prismaDb.event_review.count({ where: { ...where, created_at: { gte: sevenDaysAgo } } });

        return {
            total_reviews: total,
            flagged_reviews: flagged,
            // `ROUND(AVG(rating), 2)` — 2-decimal rounding reproduced in JS.
            average_rating: Math.round((ratingAgg._avg.rating ?? 0) * 100) / 100,
            five_star: five,
            four_star: four,
            three_star: three,
            two_star: two,
            one_star: one,
            reviews_last_7_days: reviewsLast7Days,
        };
    }
}
