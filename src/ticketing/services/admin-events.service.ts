/**
 * Gestion des événements par les admins Adigo dans adigo2
 * (TICKETING_MODULE_PLAN_2026-10.md §3.1 / §5.1 B-C).
 *
 * brouillon ──publier──▶ publié ──(fin)──▶ terminé ; brouillon/publié ──annuler──▶ annulé.
 * Un événement naît toujours brouillon, même créé par un admin.
 */
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { InputReader, defined } from "../utils/input";
import { decimalToNumber, hasEnded } from "../utils/ticketing-rules";
import { EventStatsService } from "./event-stats.service";
import { TicketRefundService } from "./ticket-refund.service";
import { TicketPurchaseService } from "./ticket-purchase.service";
import { TicketingNotifier } from "./ticketing-notifier.service";
import { EventControllerService } from "./event-controller.service";

type Result<T = unknown> = { ok: true; body: T; message?: string } | { ok: false; code: number; message: string };

const adminEventInclude = {
    event_category: { select: { id: true, name: true, name_fr: true, name_en: true, icon: true, color: true } },
    event_organizer: { select: { id: true, name: true, logo: true, customer_id: true, phone: true, email: true } },
    event_ticket_type: { orderBy: { price: 'asc' } },
} satisfies Prisma.eventInclude;

type AdminEventRow = Prisma.eventGetPayload<{ include: typeof adminEventInclude }>;

function serializeEvent(row: AdminEventRow) {
    const { event_category, event_organizer, event_ticket_type, ...rest } = row;
    return {
        ...rest,
        category: event_category,
        organizer: event_organizer,
        ticket_types: event_ticket_type.map((t) => ({ ...t, available: Math.max(0, t.quantity - (t.sold ?? 0)) })),
        has_ended: hasEnded(row),
    };
}

interface TicketTypeInput {
    name?: string | null;
    description?: string | null;
    price?: number | null;
    quantity?: number | null;
    max_per_order?: number | null;
    sale_start?: Date | null;
    sale_end?: Date | null;
    is_active?: boolean;
}

function readTicketType(body: Record<string, unknown>, creating: boolean, prefix = ''): { value: TicketTypeInput; errors: string[] } {
    const r = new InputReader(body);
    const value: TicketTypeInput = {
        name: r.string('name', `${prefix}Nom du billet`, { required: creating, max: 100 }),
        description: r.string('description', `${prefix}Description`),
        price: r.int('price', `${prefix}Prix`, { required: creating, min: 0 }),
        quantity: r.int('quantity', `${prefix}Quantité`, { required: creating, min: 1 }),
        max_per_order: r.int('max_per_order', `${prefix}Maximum par commande`, { min: 1, max: 100 }),
        sale_start: r.date('sale_start', `${prefix}Début de vente`),
        sale_end: r.date('sale_end', `${prefix}Fin de vente`),
        is_active: r.bool('is_active'),
    };
    if (value.sale_start && value.sale_end && value.sale_end <= value.sale_start) {
        r.errors.push(`${prefix}La fin de vente doit être après le début de vente`);
    }
    return { value, errors: r.errors };
}

function readEvent(body: Record<string, unknown>, creating: boolean) {
    const r = new InputReader(body);
    const value = {
        title: r.string('title', 'Titre', { required: creating, max: 255 }),
        description: r.string('description', 'Description'),
        category_id: r.int('category_id', 'Catégorie', { required: creating, min: 1 }),
        organizer_id: r.int('organizer_id', 'Organisateur', { required: creating, min: 1 }),
        cover_image: r.string('cover_image', 'Image de couverture', { max: 255 }),
        gallery_images: r.stringArray('gallery_images', 'Galerie'),
        event_date: r.date('event_date', 'Date de début', { required: creating }),
        event_end_date: r.date('event_end_date', 'Date de fin'),
        registration_deadline: r.date('registration_deadline', 'Date limite d\'inscription'),
        venue_name: r.string('venue_name', 'Lieu', { required: creating, max: 255 }),
        venue_address: r.string('venue_address', 'Adresse'),
        city: r.string('city', 'Ville', { required: creating, max: 100 }),
        maps_link: r.string('maps_link', 'Lien Maps'),
        terms_and_conditions: r.string('terms_and_conditions', 'Conditions'),
        cancellation_policy: r.string('cancellation_policy', 'Politique d\'annulation'),
        refund_policy: r.string('refund_policy', 'Politique de remboursement'),
        contact_name: r.string('contact_name', 'Nom du contact', { max: 100 }),
        contact_phone: r.string('contact_phone', 'Téléphone du contact', { max: 20 }),
        contact_email: r.string('contact_email', 'Email du contact', { max: 100 }),
        is_featured: r.bool('is_featured'),
    };
    if (value.event_date && value.event_end_date && value.event_end_date <= value.event_date) {
        r.errors.push('La date de fin doit être après la date de début');
    }
    return { value, reader: r };
}

async function checkRefs(categoryId?: number | null, organizerId?: number | null): Promise<string | null> {
    if (categoryId) {
        const cat = await prismaDb.event_category.findUnique({ where: { id: categoryId }, select: { id: true } });
        if (!cat) return 'Catégorie introuvable';
    }
    if (organizerId) {
        const org = await prismaDb.event_organizer.findFirst({ where: { id: organizerId, is_deleted: false }, select: { id: true } });
        if (!org) return 'Organisateur introuvable';
    }
    return null;
}

export class AdminEventsService {

    static async list(query: Record<string, string | undefined>) {
        const where: Prisma.eventWhereInput = { is_deleted: false };
        if (query.status) where.status = query.status;
        if (query.organizer_id) where.organizer_id = Number(query.organizer_id);
        if (query.category_id) where.category_id = Number(query.category_id);
        if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { venue_name: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const from = query.from ? new Date(query.from) : null;
        const to = query.to ? new Date(query.to) : null;
        if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
            where.event_date = {
                ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
                ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
            };
        }
        const limit = Math.min(Number(query.limit) || 50, 200);
        const offset = Number(query.offset) || 0;

        const [rows, total] = await Promise.all([
            prismaDb.event.findMany({ where, include: adminEventInclude, orderBy: { event_date: 'desc' }, take: limit, skip: offset }),
            prismaDb.event.count({ where }),
        ]);
        const summaries = await EventStatsService.summarizeEvents(rows.map((r) => r.id));
        const events = rows.map((row) => {
            const e = serializeEvent(row);
            const capacity = row.event_ticket_type.reduce((sum, t) => sum + t.quantity, 0);
            return { ...e, capacity, stats: summaries.get(row.id) };
        });
        return { events, total, limit, offset };
    }

    static async detail(eventId: number): Promise<Result> {
        const row = await prismaDb.event.findFirst({ where: { id: eventId, is_deleted: false }, include: adminEventInclude });
        if (!row) return { ok: false, code: 404, message: 'Événement introuvable' };
        const [stats, controllers] = await Promise.all([
            EventStatsService.eventDetail(eventId),
            prismaDb.event_controller.groupBy({ by: ['status'], where: { event_id: eventId }, _count: { _all: true } }),
        ]);
        return {
            ok: true,
            body: {
                ...serializeEvent(row),
                stats,
                controllers_by_status: Object.fromEntries(controllers.map((c) => [c.status, c._count._all])),
            },
        };
    }

    static async create(body: Record<string, unknown>, adminId?: number): Promise<Result> {
        const { value, reader } = readEvent(body, true);
        const rawTypes = Array.isArray(body.ticket_types) ? (body.ticket_types as Record<string, unknown>[]) : [];
        const types = rawTypes.map((t, i) => readTicketType(t ?? {}, true, `Billet ${i + 1} — `));
        const errors = [...reader.errors, ...types.flatMap((t) => t.errors)];
        const names = types.map((t) => t.value.name?.toLowerCase()).filter(Boolean);
        if (new Set(names).size !== names.length) errors.push('Deux types de billet ne peuvent pas avoir le même nom');
        if (errors.length) return { ok: false, code: 400, message: errors.join(' · ') };

        const refError = await checkRefs(value.category_id, value.organizer_id);
        if (refError) return { ok: false, code: 400, message: refError };

        const created = await prismaDb.event.create({
            data: {
                ...(defined(value) as Prisma.eventUncheckedCreateInput),
                status: 'draft',
                validation_status: 'pending',
                created_by: adminId ?? null,
                event_ticket_type: {
                    create: types.map(({ value: t }) => ({
                        name: t.name!,
                        description: t.description ?? null,
                        price: t.price!,
                        quantity: t.quantity!,
                        max_per_order: t.max_per_order ?? 10,
                        sale_start: t.sale_start ?? null,
                        sale_end: t.sale_end ?? null,
                        is_active: t.is_active ?? true,
                    })),
                },
            } as Prisma.eventUncheckedCreateInput,
        });
        return this.detail(created.id);
    }

    static async update(eventId: number, body: Record<string, unknown>): Promise<Result> {
        const event = await prismaDb.event.findFirst({ where: { id: eventId, is_deleted: false } });
        if (!event) return { ok: false, code: 404, message: 'Événement introuvable' };
        if (event.status === 'cancelled' || event.status === 'completed') {
            return { ok: false, code: 400, message: 'Un événement annulé ou terminé ne peut plus être modifié' };
        }

        const { value, reader } = readEvent(body, false);
        if (reader.ok === false) return { ok: false, code: 400, message: reader.message };
        if (value.organizer_id && value.organizer_id !== event.organizer_id && event.status !== 'draft') {
            return { ok: false, code: 400, message: 'L\'organisateur ne peut être changé que sur un brouillon' };
        }
        const start = value.event_date ?? event.event_date;
        const end = value.event_end_date === undefined ? event.event_end_date : value.event_end_date;
        if (end && end <= start) return { ok: false, code: 400, message: 'La date de fin doit être après la date de début' };

        const refError = await checkRefs(value.category_id, value.organizer_id);
        if (refError) return { ok: false, code: 400, message: refError };

        const data = defined(value) as Prisma.eventUncheckedUpdateInput;
        // Champs obligatoires en base : un `null` venu du formulaire ne les efface pas.
        for (const key of ['title', 'category_id', 'organizer_id', 'event_date', 'venue_name', 'city'] as const) {
            if (data[key] === null) delete data[key];
        }
        await prismaDb.event.update({ where: { id: eventId }, data: { ...data, updated_at: new Date() } });
        return this.detail(eventId);
    }

    static async publish(eventId: number, adminId?: number): Promise<Result> {
        const event = await prismaDb.event.findFirst({
            where: { id: eventId, is_deleted: false },
            include: { event_ticket_type: true, event_organizer: { select: { is_deleted: true } } },
        });
        if (!event) return { ok: false, code: 404, message: 'Événement introuvable' };
        if (event.status !== 'draft' && event.status !== 'pending') {
            return { ok: false, code: 400, message: 'Seul un brouillon peut être publié' };
        }
        if (!event.event_ticket_type.some((t) => t.is_active !== false)) {
            return { ok: false, code: 400, message: 'Ajoutez au moins un type de billet actif avant de publier' };
        }
        if (event.event_date <= new Date()) {
            return { ok: false, code: 400, message: 'La date de l\'événement est déjà passée' };
        }
        if (event.event_organizer?.is_deleted) {
            return { ok: false, code: 400, message: 'L\'organisateur de cet événement a été supprimé' };
        }

        const now = new Date();
        const updated = await prismaDb.event.updateMany({
            where: { id: eventId, status: { in: ['draft', 'pending'] } },
            data: {
                status: 'published', sales_paused: false, published_at: now,
                validation_status: 'approved', validated_by: adminId ?? null, validated_at: now, updated_at: now,
            },
        });
        if (updated.count === 0) return { ok: false, code: 409, message: 'Cet événement vient d\'être modifié' };
        void TicketingNotifier.eventPublished(eventId);
        return this.detail(eventId);
    }

    static async setSalesPaused(eventId: number, paused: boolean, reason?: string | null): Promise<Result> {
        const updated = await prismaDb.event.updateMany({
            where: { id: eventId, is_deleted: false, status: 'published', sales_paused: !paused },
            data: { sales_paused: paused, updated_at: new Date() },
        });
        if (updated.count === 0) {
            return { ok: false, code: 400, message: paused ? 'Seul un événement publié en vente peut être suspendu' : 'Les ventes de cet événement ne sont pas suspendues' };
        }
        void TicketingNotifier.eventSalesPaused(eventId, paused, reason);
        return this.detail(eventId);
    }

    /**
     * Annulation : tous les billets payés sont remboursés intégralement sur
     * le portefeuille, les billets en attente de paiement sont annulés (un
     * paiement qui arriverait ensuite est remboursé par ticket.settlement),
     * les contrôleurs sont révoqués, l'organisateur et les acheteurs sont
     * prévenus.
     */
    static async cancel(eventId: number, reason: string | undefined): Promise<Result> {
        if (!reason?.trim()) return { ok: false, code: 400, message: 'Le motif d\'annulation est obligatoire' };
        const now = new Date();
        const updated = await prismaDb.event.updateMany({
            where: { id: eventId, is_deleted: false, status: { in: ['draft', 'pending', 'published'] } },
            data: { status: 'cancelled', cancellation_reason: reason.trim(), cancelled_at: now, sales_paused: true, updated_at: now },
        });
        if (updated.count === 0) return { ok: false, code: 400, message: 'Cet événement ne peut pas être annulé (déjà annulé ou terminé)' };

        const tickets = await prismaDb.event_ticket.findMany({
            where: { event_id: eventId, is_deleted: false, status: { in: ['pending', 'confirmed', 'used'] } },
            select: { id: true, status: true, payment_status: true },
        });
        const refunds: Array<{ customerId: number; amount: number; reference: string | null }> = [];
        const failures: number[] = [];
        for (const t of tickets) {
            if (t.payment_status === 'paid') {
                const result = await TicketRefundService.refund(t.id, { reason: `Événement annulé : ${reason.trim()}` });
                if (result.ok) refunds.push({ customerId: result.customerId, amount: result.amount, reference: result.reference });
                else failures.push(t.id);
            } else if (t.status === 'pending') {
                await TicketPurchaseService.cancelUnpaid(t.id);
            }
        }
        await EventControllerService.revokeAllForEvent(eventId);
        void TicketingNotifier.eventCancelled(eventId, reason.trim(), refunds);

        const detail = await this.detail(eventId);
        if (detail.ok === false) return detail;
        return {
            ok: true,
            body: { ...(detail.body as object), refunded_tickets: refunds.length, refunded_amount: refunds.reduce((s, r) => s + r.amount, 0), refund_failures: failures },
            message: failures.length
                ? `Événement annulé — ${failures.length} remboursement(s) en échec, à reprendre depuis Transactions`
                : `Événement annulé — ${refunds.length} billet(s) remboursé(s)`,
        };
    }

    /** Suppression d'un brouillon sans aucun billet (sinon : annuler). */
    static async remove(eventId: number, adminId?: number): Promise<Result> {
        const event = await prismaDb.event.findFirst({ where: { id: eventId, is_deleted: false } });
        if (!event) return { ok: false, code: 404, message: 'Événement introuvable' };
        if (event.status !== 'draft') return { ok: false, code: 400, message: 'Seul un brouillon peut être supprimé — annulez l\'événement sinon' };
        const tickets = await prismaDb.event_ticket.count({ where: { event_id: eventId } });
        if (tickets > 0) return { ok: false, code: 400, message: 'Cet événement a des billets : annulez-le plutôt que de le supprimer' };
        await prismaDb.event.update({ where: { id: eventId }, data: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId ?? null } });
        return { ok: true, body: { id: eventId } };
    }

    // ─── Types de billet ─────────────────────────────────────────────

    static async addTicketType(eventId: number, body: Record<string, unknown>): Promise<Result> {
        const event = await prismaDb.event.findFirst({ where: { id: eventId, is_deleted: false } });
        if (!event) return { ok: false, code: 404, message: 'Événement introuvable' };
        if (event.status === 'cancelled' || event.status === 'completed') {
            return { ok: false, code: 400, message: 'Événement annulé ou terminé' };
        }
        const { value, errors } = readTicketType(body, true);
        if (errors.length) return { ok: false, code: 400, message: errors.join(' · ') };
        try {
            await prismaDb.event_ticket_type.create({
                data: {
                    event_id: eventId,
                    name: value.name!,
                    description: value.description ?? null,
                    price: value.price!,
                    quantity: value.quantity!,
                    max_per_order: value.max_per_order ?? 10,
                    sale_start: value.sale_start ?? null,
                    sale_end: value.sale_end ?? null,
                    is_active: value.is_active ?? true,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { ok: false, code: 409, message: 'Un type de billet porte déjà ce nom pour cet événement' };
            }
            throw error;
        }
        return this.detail(eventId);
    }

    static async updateTicketType(typeId: number, body: Record<string, unknown>): Promise<Result> {
        const type = await prismaDb.event_ticket_type.findUnique({ where: { id: typeId }, include: { event: true } });
        if (!type || type.event.is_deleted) return { ok: false, code: 404, message: 'Type de billet introuvable' };
        if (type.event.status === 'cancelled' || type.event.status === 'completed') {
            return { ok: false, code: 400, message: 'Événement annulé ou terminé' };
        }
        const { value, errors } = readTicketType(body, false);
        if (errors.length) return { ok: false, code: 400, message: errors.join(' · ') };
        if (value.quantity != null && value.quantity < (type.sold ?? 0)) {
            return { ok: false, code: 400, message: `La quantité ne peut pas être inférieure aux ${type.sold} place(s) déjà réservée(s)` };
        }
        const start = value.sale_start === undefined ? type.sale_start : value.sale_start;
        const end = value.sale_end === undefined ? type.sale_end : value.sale_end;
        if (start && end && end <= start) return { ok: false, code: 400, message: 'La fin de vente doit être après le début de vente' };

        const data = defined(value) as Prisma.event_ticket_typeUpdateInput;
        for (const key of ['name', 'price', 'quantity', 'max_per_order'] as const) {
            if (data[key] === null) delete data[key];
        }
        try {
            await prismaDb.event_ticket_type.update({ where: { id: typeId }, data });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { ok: false, code: 409, message: 'Un type de billet porte déjà ce nom pour cet événement' };
            }
            throw error;
        }
        return this.detail(type.event_id);
    }

    static async deleteTicketType(typeId: number): Promise<Result> {
        const type = await prismaDb.event_ticket_type.findUnique({ where: { id: typeId } });
        if (!type) return { ok: false, code: 404, message: 'Type de billet introuvable' };
        const tickets = await prismaDb.event_ticket.count({ where: { ticket_type_id: typeId } });
        if (tickets > 0) return { ok: false, code: 400, message: 'Ce type de billet a déjà des ventes : désactivez-le plutôt' };
        await prismaDb.event_ticket_type.delete({ where: { id: typeId } });
        return this.detail(type.event_id);
    }

    // ─── Billets d'un événement ──────────────────────────────────────

    static async tickets(eventId: number, query: Record<string, string | undefined>) {
        const where: Prisma.event_ticketWhereInput = { event_id: eventId, is_deleted: false };
        if (query.status) where.status = query.status;
        if (query.payment_status) where.payment_status = query.payment_status;
        if (query.ticket_type_id) where.ticket_type_id = Number(query.ticket_type_id);
        if (query.search) {
            where.OR = [
                { reference: { contains: query.search, mode: 'insensitive' } },
                { customer: { first_name: { contains: query.search, mode: 'insensitive' } } },
                { customer: { last_name: { contains: query.search, mode: 'insensitive' } } },
                { customer: { phone: { contains: query.search } } },
                { customer: { email: { contains: query.search, mode: 'insensitive' } } },
            ];
        }
        const limit = Math.min(Number(query.limit) || 100, 1000);
        const offset = Number(query.offset) || 0;

        const [rows, total] = await Promise.all([
            prismaDb.event_ticket.findMany({
                where,
                include: {
                    customer: { select: { id: true, first_name: true, last_name: true, phone: true, email: true } },
                    event_ticket_type: { select: { id: true, name: true } },
                    ticket_scan: { orderBy: { scanned_at: 'desc' }, take: 1 },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prismaDb.event_ticket.count({ where }),
        ]);

        const scannerIds = Array.from(new Set(rows.flatMap((r) => r.ticket_scan.map((s) => s.scanned_by_customer_id)).filter((v): v is number => v != null)));
        const scanners = scannerIds.length
            ? await prismaDb.customer.findMany({ where: { id: { in: scannerIds } }, select: { id: true, first_name: true, last_name: true } })
            : [];
        const scannerName = new Map(scanners.map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim()]));

        const tickets = rows.map(({ event_ticket_type, ticket_scan, commission_rate, ...t }) => {
            const last = ticket_scan[0];
            return {
                ...t,
                commission_rate: decimalToNumber(commission_rate),
                ticket_type: event_ticket_type,
                last_scan_at: last?.scanned_at ?? null,
                last_scan_by: last ? (last.scanned_by_customer_id ? scannerName.get(last.scanned_by_customer_id) ?? null : 'ADIGO') : null,
            };
        });
        return { tickets, total, limit, offset };
    }
}
