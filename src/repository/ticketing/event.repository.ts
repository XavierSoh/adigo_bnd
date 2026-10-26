// Lecture publique des événements (app mobile). Migrated to Prisma's native
// model API — see BOOKING_MODULE_NOTES.md ("Full Prisma relational-API
// migration", tier 3).
//
// Billetterie opérée par Adigo (TICKETING_MODULE_PLAN_2026-10.md) : toute
// écriture passe par src/ticketing/services/admin-events.service.ts ; ce
// repository ne fait plus que lire, et ne montre aux clients que ce qu'ils
// ont le droit de voir.
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import ResponseModel from "../../models/response.model";
import { DEFAULT_EVENT_DURATION_HOURS } from "../../ticketing/utils/ticketing-rules";

const withJoins = {
    event_category: true,
    // Uniquement les champs publics de l'organisateur : la fiche complète
    // contient téléphone, email, coordonnées de reversement, taux de
    // commission et pièces d'identité.
    event_organizer: { select: { id: true, name: true, logo: true, type: true, description: true, is_verified: true } },
    // Only to derive min_price/max_price below — the mobile list/detail read
    // those (no event-level price column exists), and without them every
    // paid event rendered as "Free".
    event_ticket_type: { where: { is_active: true }, select: { price: true } },
} satisfies Prisma.eventInclude;

// Colonnes internes jamais renvoyées au public.
const internalColumns = [
    'created_by', 'validated_by', 'validation_notes', 'validation_status', 'deleted_by',
    'premium_design_amount', 'boost_amount', 'featured_placement_amount',
] as const;

/** `category`/`organizer` — the original's json alias names — instead of
 * Prisma's relation names (`event_category`/`event_organizer`). */
function mapEvent<T extends { event_category: unknown; event_organizer: { name: string } | null; event_ticket_type: { price: number }[] }>(row: T) {
    const { event_category, event_organizer, event_ticket_type, ...rest } = row;
    const publicRest: Record<string, unknown> = { ...rest };
    for (const key of internalColumns) delete publicRest[key];
    const prices = event_ticket_type.map((t) => t.price);
    return {
        ...publicRest,
        category: event_category,
        organizer: event_organizer,
        organizer_name: event_organizer?.name ?? null,
        min_price: prices.length ? Math.min(...prices) : null,
        max_price: prices.length ? Math.max(...prices) : null,
    };
}

export interface PublicEventFilters {
    search?: string;
    category_id?: number;
    city?: string;
    organizer_id?: number;
    is_featured?: boolean;
    start_date?: Date;
    end_date?: Date;
    min_price?: number;
    max_price?: number;
    limit?: number;
    offset?: number;
}

/** Statuts visibles quand on ouvre un événement par son id/code (lien depuis un billet). */
const VISIBLE_BY_ID = ['published', 'completed', 'cancelled'];

export class EventRepository {

    /**
     * Événements en vente ou en cours : publiés, non supprimés, pas encore
     * terminés. Tous les filtres envoyés par l'app sont appliqués côté
     * serveur (ils étaient ignorés jusqu'ici).
     */
    static async findPublic(filters: PublicEventFilters): Promise<ResponseModel> {
        try {
            const now = new Date();
            const startedCutoff = new Date(now.getTime() - DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000);
            const and: Prisma.eventWhereInput[] = [
                { status: 'published', is_deleted: false },
                {
                    OR: [
                        { event_end_date: { gte: now } },
                        { event_end_date: null, event_date: { gte: startedCutoff } },
                    ],
                },
            ];
            if (filters.search) {
                and.push({
                    OR: [
                        { title: { contains: filters.search, mode: 'insensitive' } },
                        { description: { contains: filters.search, mode: 'insensitive' } },
                        { venue_name: { contains: filters.search, mode: 'insensitive' } },
                    ],
                });
            }
            if (filters.category_id) and.push({ category_id: filters.category_id });
            if (filters.city) and.push({ city: { contains: filters.city, mode: 'insensitive' } });
            if (filters.organizer_id) and.push({ organizer_id: filters.organizer_id });
            if (filters.is_featured) and.push({ is_featured: true });
            if (filters.start_date) and.push({ event_date: { gte: filters.start_date } });
            if (filters.end_date) and.push({ event_date: { lte: filters.end_date } });

            const rows = await prismaDb.event.findMany({
                where: { AND: and },
                include: withJoins,
                orderBy: { event_date: 'asc' },
                take: Math.min(filters.limit ?? 50, 200),
                skip: filters.offset ?? 0,
            });

            let events = rows.map(mapEvent);
            if (filters.min_price !== undefined) {
                events = events.filter((e) => e.max_price !== null && e.max_price >= filters.min_price!);
            }
            if (filters.max_price !== undefined) {
                events = events.filter((e) => e.min_price !== null && e.min_price <= filters.max_price!);
            }
            return { status: true, message: "Événements récupérés", body: events, code: 200 };
        } catch (error) {
            console.error('EventRepository.findPublic error:', error);
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findVisibleById(id: number, isAdmin: boolean): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.findFirst({
                where: { id, is_deleted: false, ...(isAdmin ? {} : { status: { in: VISIBLE_BY_ID } }) },
                include: withJoins,
            });
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: mapEvent(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findVisibleByCode(code: string, isAdmin: boolean): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.findFirst({
                where: { code, is_deleted: false, ...(isAdmin ? {} : { status: { in: VISIBLE_BY_ID } }) },
                include: withJoins,
            });
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: mapEvent(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async isVisible(id: number, isAdmin: boolean): Promise<boolean> {
        const row = await prismaDb.event.findFirst({
            where: { id, is_deleted: false, ...(isAdmin ? {} : { status: { in: VISIBLE_BY_ID } }) },
            select: { id: true },
        });
        return !!row;
    }

    static async incrementViews(id: number): Promise<void> {
        await prismaDb.event.updateMany({ where: { id }, data: { views_count: { increment: 1 } } });
    }
}
