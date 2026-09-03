// Migrated to Prisma's native model API (prisma.event.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { EventCreateDto, EventUpdateDto, EventSearchParams, EventStatus } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";

// `row_to_json(c)`/`row_to_json(o)` selected EVERY column of
// event_category/event_organizer — `include: {event_category: true,
// event_organizer: true}` (no `select`) reproduces that exactly.
const withJoins = {
    event_category: true,
    event_organizer: true,
} satisfies Prisma.eventInclude;

/** `category`/`organizer` — the original's json alias names — instead of
 * Prisma's relation names (`event_category`/`event_organizer`, needed
 * because the schema also has an unrelated `event_category[]` reverse
 * relation elsewhere, forcing the full name here). */
function mapEvent<T extends { event_category: unknown; event_organizer: unknown }>(row: T) {
    const { event_category, event_organizer, ...rest } = row;
    return { ...rest, category: event_category, organizer: event_organizer };
}

export class EventRepository {

    static async findAll(limit = 50, offset = 0): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.event.findMany({
                include: withJoins,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            });
            return { status: true, message: "Événements récupérés", body: rows.map(mapEvent), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.findUnique({ where: { id }, include: withJoins });
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: mapEvent(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByCode(code: string): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.findUnique({ where: { code }, include: withJoins });
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: mapEvent(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async search(params: EventSearchParams): Promise<ResponseModel> {
        try {
            const where: Prisma.eventWhereInput = {};

            if (params.search) {
                where.OR = [
                    { title: { contains: params.search, mode: 'insensitive' } },
                    { description: { contains: params.search, mode: 'insensitive' } },
                ];
            }
            if (params.category_id) where.category_id = params.category_id;
            if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
            if (params.status) where.status = params.status;
            if (params.organizer_id) where.organizer_id = params.organizer_id;
            if (params.is_featured) where.is_featured = true;
            if (params.start_date || params.end_date) {
                where.event_date = {
                    ...(params.start_date ? { gte: params.start_date } : {}),
                    ...(params.end_date ? { lte: params.end_date } : {}),
                };
            }

            const rows = await prismaDb.event.findMany({
                where,
                include: withJoins,
                orderBy: { event_date: 'asc' },
                take: params.limit ?? 20,
                skip: params.offset ?? 0,
            });

            return { status: true, message: "Recherche effectuée", body: rows.map(mapEvent), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: EventCreateDto): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.create({
                data: {
                    title: data.title,
                    description: data.description,
                    category_id: data.category_id,
                    organizer_id: data.organizer_id,
                    cover_image: data.cover_image,
                    event_date: data.event_date,
                    event_end_date: data.event_end_date,
                    venue_name: data.venue_name,
                    venue_address: data.venue_address,
                    city: data.city,
                    maps_link: data.maps_link,
                    registration_deadline: data.registration_deadline,
                    gallery_images: data.gallery_images,
                    terms_and_conditions: data.terms_and_conditions,
                    cancellation_policy: data.cancellation_policy,
                    refund_policy: data.refund_policy,
                    contact_name: data.contact_name,
                    contact_phone: data.contact_phone,
                    contact_email: data.contact_email,
                    has_premium_design: data.has_premium_design ?? false,
                    has_boost: data.has_boost ?? false,
                    has_featured_placement: data.has_featured_placement ?? false,
                    boost_start_date: data.boost_start_date,
                    boost_end_date: data.boost_end_date,
                    featured_placement_duration: data.featured_placement_duration,
                    premium_design_amount: data.premium_design_amount ?? 0,
                    boost_amount: data.boost_amount ?? 0,
                    featured_placement_amount: data.featured_placement_amount ?? 0,
                    created_by: data.created_by ?? null,
                } as Prisma.eventUncheckedCreateInput,
            });
            return { status: true, message: "Événement créé", body: result, code: 201 };
        } catch (error) {
            console.error('Event creation error:', error);
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: EventUpdateDto): Promise<ResponseModel> {
        try {
            const updateData: Prisma.eventUncheckedUpdateInput = { updated_at: new Date() };
            if (data.title != null) updateData.title = data.title;
            if (data.description != null) updateData.description = data.description;
            if (data.category_id != null) updateData.category_id = data.category_id;
            if (data.cover_image != null) updateData.cover_image = data.cover_image;
            if (data.event_date != null) updateData.event_date = data.event_date;
            if (data.event_end_date != null) updateData.event_end_date = data.event_end_date;
            if (data.venue_name != null) updateData.venue_name = data.venue_name;
            if (data.venue_address != null) updateData.venue_address = data.venue_address;
            if (data.city != null) updateData.city = data.city;
            if (data.maps_link != null) updateData.maps_link = data.maps_link;
            if (data.registration_deadline != null) updateData.registration_deadline = data.registration_deadline;
            if (data.gallery_images != null) updateData.gallery_images = data.gallery_images;
            if (data.terms_and_conditions != null) updateData.terms_and_conditions = data.terms_and_conditions;
            if (data.cancellation_policy != null) updateData.cancellation_policy = data.cancellation_policy;
            if (data.refund_policy != null) updateData.refund_policy = data.refund_policy;
            if (data.contact_name != null) updateData.contact_name = data.contact_name;
            if (data.contact_phone != null) updateData.contact_phone = data.contact_phone;
            if (data.contact_email != null) updateData.contact_email = data.contact_email;
            if (data.has_premium_design != null) updateData.has_premium_design = data.has_premium_design;
            if (data.has_boost != null) updateData.has_boost = data.has_boost;
            if (data.has_featured_placement != null) updateData.has_featured_placement = data.has_featured_placement;
            if (data.boost_start_date != null) updateData.boost_start_date = data.boost_start_date;
            if (data.boost_end_date != null) updateData.boost_end_date = data.boost_end_date;
            if (data.featured_placement_duration != null) updateData.featured_placement_duration = data.featured_placement_duration;
            if (data.premium_design_amount != null) updateData.premium_design_amount = data.premium_design_amount;
            if (data.boost_amount != null) updateData.boost_amount = data.boost_amount;
            if (data.featured_placement_amount != null) updateData.featured_placement_amount = data.featured_placement_amount;

            const result = await prismaDb.event.update({ where: { id }, data: updateData });
            return { status: true, message: "Événement mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async updateStatus(id: number, status: EventStatus): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.update({ where: { id }, data: { status } });
            return { status: true, message: "Statut mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    // Organizer submits a draft event for admin validation — does NOT
    // publish it. Actual publication happens via EventValidationController
    // .approveEvent, which is the only path that sets status='published'.
    static async submitForValidation(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.updateMany({
                where: { id, is_deleted: false, status: 'draft' },
                data: { status: 'pending', validation_status: 'pending', updated_at: new Date() },
            });
            if (result.count === 0) return { status: false, message: "Événement non trouvé ou déjà soumis", code: 404 };
            const updated = await prismaDb.event.findUnique({ where: { id } });
            return { status: true, message: "Événement soumis pour validation", body: updated, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la soumission pour validation", code: 500 };
        }
    }

    static async incrementViews(id: number): Promise<void> {
        // Original used `pgNone` — a silent no-op on a bad id, never
        // throws. `updateMany` (not `.update()`, which would throw P2025)
        // reproduces that exactly.
        await prismaDb.event.updateMany({ where: { id }, data: { views_count: { increment: 1 } } });
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event.deleteMany({ where: { id } });
            if (result.count === 0) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}
