/**
 * Organisateurs et reversements, gérés par les admins Adigo dans adigo2
 * (TICKETING_MODULE_PLAN_2026-10.md §4 / §5.1 A et D).
 *
 * Une fiche créée par un admin est d'office « vérifiée » : c'est Adigo qui
 * crée et vend les événements, il n'y a plus de file de vérification. Le
 * compte client lié est optionnel (l'organisateur peut ne pas avoir encore
 * installé l'app) ; c'est lui qui donne accès à l'espace organisateur.
 */
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { InputReader, defined } from "../utils/input";
import { decimalToNumber } from "../utils/ticketing-rules";
import { CommissionService } from "./commission.service";
import { EventStatsService } from "./event-stats.service";
import { TicketingNotifier } from "./ticketing-notifier.service";

type Result<T = unknown> = { ok: true; body: T } | { ok: false; code: number; message: string };

const ORGANIZER_TYPES = ['individual', 'company', 'association'];
const PAYOUT_METHODS = ['orange_money', 'mtn_momo', 'bank_transfer', 'cash', 'other'];

const linkedCustomerSelect = { id: true, first_name: true, last_name: true, phone: true, email: true } as const;

function serializeOrganizer<T extends { commission_rate: unknown }>(row: T) {
    return { ...row, commission_rate: decimalToNumber(row.commission_rate) };
}

function readOrganizer(body: Record<string, unknown>, creating: boolean) {
    const r = new InputReader(body);
    const value = {
        name: r.string('name', 'Nom', { required: creating, max: 255 }),
        type: r.string('type', 'Type'),
        phone: r.string('phone', 'Téléphone', { required: creating, max: 20 }),
        email: r.string('email', 'Email', { required: creating, max: 100 }),
        logo: r.string('logo', 'Logo', { max: 255 }),
        description: r.string('description', 'Description'),
        payment_info: r.string('payment_info', 'Coordonnées de reversement'),
        commission_rate: r.decimal('commission_rate', 'Taux de commission', { min: 0, max: 100 }),
        customer_id: r.int('customer_id', 'Compte client', { min: 1 }),
    };
    if (value.type && !ORGANIZER_TYPES.includes(value.type)) r.errors.push('Type d\'organisateur invalide');
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) r.errors.push('Email invalide');
    return { value, reader: r };
}

async function checkLinkedCustomer(customerId: number | null | undefined, organizerId?: number): Promise<string | null> {
    if (!customerId) return null;
    const customer = await prismaDb.customer.findFirst({ where: { id: customerId, is_deleted: false }, select: { id: true } });
    if (!customer) return 'Compte client introuvable';
    const other = await prismaDb.event_organizer.findFirst({
        where: { customer_id: customerId, ...(organizerId ? { id: { not: organizerId } } : {}) },
        select: { id: true, name: true, is_deleted: true },
    });
    if (other && !other.is_deleted) return `Ce compte est déjà lié à l'organisateur « ${other.name} »`;
    return null;
}

/**
 * customer.role = 'organizer' pour le compte lié à une fiche (c'est ce que
 * filtre l'écran Utilisateurs d'adigo2), remis à 'customer' quand il est
 * délié. Ce rôle n'a aucun effet sur les droits : l'accès à l'espace
 * organisateur se décide uniquement par le lien event_organizer.customer_id.
 */
async function syncLinkedCustomerRole(previousCustomerId: number | null | undefined, nextCustomerId: number | null | undefined) {
    if (previousCustomerId && previousCustomerId !== nextCustomerId) {
        await prismaDb.customer.updateMany({ where: { id: previousCustomerId, role: 'organizer' }, data: { role: 'customer' } });
    }
    if (nextCustomerId) {
        await prismaDb.customer.updateMany({
            where: { id: nextCustomerId, OR: [{ role: null }, { role: 'customer' }] },
            data: { role: 'organizer' },
        });
    }
}

export class AdminOrganizersService {

    static async list(query: Record<string, string | undefined>) {
        const where: Prisma.event_organizerWhereInput = query.include_deleted === 'true' ? {} : { is_deleted: false };
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search } },
            ];
        }
        const rows = await prismaDb.event_organizer.findMany({
            where,
            include: { customer: { select: linkedCustomerSelect } },
            orderBy: { name: 'asc' },
        });
        const ids = rows.map((r) => r.id);
        const [balances, rates] = await Promise.all([
            EventStatsService.balancesForOrganizers(ids),
            CommissionService.ratesForOrganizers(ids),
        ]);
        return rows.map((row) => ({
            ...serializeOrganizer(row),
            effective_commission_rate: rates.get(row.id),
            balance: balances.get(row.id),
        }));
    }

    static async detail(organizerId: number): Promise<Result> {
        const row = await prismaDb.event_organizer.findUnique({
            where: { id: organizerId },
            include: { customer: { select: linkedCustomerSelect } },
        });
        if (!row) return { ok: false, code: 404, message: 'Organisateur introuvable' };
        const [balance, defaultRate] = await Promise.all([
            EventStatsService.organizerBalance(organizerId),
            CommissionService.getDefaultRate(),
        ]);
        return {
            ok: true,
            body: { ...serializeOrganizer(row), effective_commission_rate: balance.commission_rate, default_commission_rate: defaultRate, balance },
        };
    }

    /** Fiche organisateur liée à un compte client, ou null. */
    static async profileOfCustomer(customerId: number) {
        const row = await prismaDb.event_organizer.findFirst({ where: { customer_id: customerId, is_deleted: false } });
        return row ? serializeOrganizer(row) : null;
    }

    static async create(body: Record<string, unknown>, adminId?: number): Promise<Result> {
        const { value, reader } = readOrganizer(body, true);
        if (reader.ok === false) return { ok: false, code: 400, message: reader.message };
        const linkError = await checkLinkedCustomer(value.customer_id);
        if (linkError) return { ok: false, code: 409, message: linkError };

        const now = new Date();
        const created = await prismaDb.event_organizer.create({
            data: {
                ...(defined(value) as Prisma.event_organizerUncheckedCreateInput),
                type: value.type ?? 'individual',
                is_verified: true,
                verification_status: 'verified',
                verified_by: adminId ?? null,
                verified_at: now,
                created_at: now,
            } as Prisma.event_organizerUncheckedCreateInput,
        });
        await syncLinkedCustomerRole(null, created.customer_id);
        void TicketingNotifier.organizerProfile(created.id, 'created');
        return this.detail(created.id);
    }

    static async update(organizerId: number, body: Record<string, unknown>): Promise<Result> {
        const existing = await prismaDb.event_organizer.findFirst({ where: { id: organizerId, is_deleted: false } });
        if (!existing) return { ok: false, code: 404, message: 'Organisateur introuvable' };
        const { value, reader } = readOrganizer(body, false);
        if (reader.ok === false) return { ok: false, code: 400, message: reader.message };
        const linkError = await checkLinkedCustomer(value.customer_id, organizerId);
        if (linkError) return { ok: false, code: 409, message: linkError };

        const data = defined(value) as Prisma.event_organizerUncheckedUpdateInput;
        for (const key of ['name', 'phone', 'email'] as const) {
            if (data[key] === null) delete data[key];
        }
        await prismaDb.event_organizer.update({ where: { id: organizerId }, data: { ...data, updated_at: new Date() } });
        if (value.customer_id !== undefined) await syncLinkedCustomerRole(existing.customer_id, value.customer_id);
        if (value.customer_id && value.customer_id !== existing.customer_id) {
            void TicketingNotifier.organizerProfile(organizerId, 'linked');
        }
        return this.detail(organizerId);
    }

    static async remove(organizerId: number, adminId?: number): Promise<Result> {
        const existing = await prismaDb.event_organizer.findFirst({ where: { id: organizerId, is_deleted: false } });
        if (!existing) return { ok: false, code: 404, message: 'Organisateur introuvable' };
        const active = await prismaDb.event.count({
            where: { organizer_id: organizerId, is_deleted: false, status: { in: ['draft', 'pending', 'published'] } },
        });
        if (active > 0) return { ok: false, code: 400, message: 'Cet organisateur a encore des événements en brouillon ou en vente' };
        const balance = (await EventStatsService.balancesForOrganizers([organizerId])).get(organizerId);
        if (balance && balance.balance_due > 0) {
            return { ok: false, code: 400, message: `Il reste ${balance.balance_due} XAF à reverser à cet organisateur` };
        }
        // customer_id libéré : le compte client pourra être lié à une autre fiche.
        await prismaDb.event_organizer.update({
            where: { id: organizerId },
            data: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId ?? null, customer_id: null },
        });
        await syncLinkedCustomerRole(existing.customer_id, null);
        return { ok: true, body: { id: organizerId } };
    }

    // ─── Reversements ────────────────────────────────────────────────

    static async balances() {
        const organizers = await prismaDb.event_organizer.findMany({
            where: { is_deleted: false },
            select: { id: true, name: true, logo: true, payment_info: true, phone: true, email: true },
            orderBy: { name: 'asc' },
        });
        const balances = await EventStatsService.balancesForOrganizers(organizers.map((o) => o.id));
        return organizers
            .map((o) => ({ ...o, ...balances.get(o.id)! }))
            .sort((a, b) => b.balance_due - a.balance_due);
    }

    static async payouts(query: Record<string, string | undefined>) {
        const where: Prisma.organizer_payoutWhereInput = { is_deleted: false };
        if (query.organizer_id) where.organizer_id = Number(query.organizer_id);
        return prismaDb.organizer_payout.findMany({
            where,
            include: {
                event_organizer: { select: { id: true, name: true } },
                event: { select: { id: true, title: true, code: true } },
            },
            orderBy: { paid_at: 'desc' },
            take: Math.min(Number(query.limit) || 200, 1000),
        });
    }

    static async recordPayout(organizerId: number, body: Record<string, unknown>, adminId?: number): Promise<Result> {
        const organizer = await prismaDb.event_organizer.findFirst({ where: { id: organizerId, is_deleted: false } });
        if (!organizer) return { ok: false, code: 404, message: 'Organisateur introuvable' };

        const r = new InputReader(body);
        const amount = r.int('amount', 'Montant', { required: true, min: 1 });
        const method = r.string('method', 'Moyen de paiement', { required: true });
        const reference = r.string('reference', 'Référence', { max: 100 });
        const notes = r.string('notes', 'Notes');
        const paidAt = r.date('paid_at', 'Date du reversement');
        const eventId = r.int('event_id', 'Événement', { min: 1 });
        if (method && !PAYOUT_METHODS.includes(method)) r.errors.push('Moyen de paiement invalide');
        if (r.ok === false) return { ok: false, code: 400, message: r.message };

        if (eventId) {
            const event = await prismaDb.event.findFirst({ where: { id: eventId, organizer_id: organizerId }, select: { id: true } });
            if (!event) return { ok: false, code: 400, message: 'Cet événement n\'appartient pas à cet organisateur' };
        }
        const balance = (await EventStatsService.balancesForOrganizers([organizerId])).get(organizerId)!;
        if (amount! > balance.balance_due) {
            return { ok: false, code: 400, message: `Le montant dépasse le solde dû (${balance.balance_due} XAF)` };
        }

        const payout = await prismaDb.organizer_payout.create({
            data: {
                organizer_id: organizerId,
                event_id: eventId ?? null,
                amount: amount!,
                method: method!,
                reference: reference ?? null,
                notes: notes ?? null,
                paid_at: paidAt ?? new Date(),
                created_by: adminId ?? null,
            },
        });
        void TicketingNotifier.payoutRecorded(payout.id, balance.balance_due - amount!);
        return { ok: true, body: payout };
    }

    /** Annule un reversement saisi par erreur (conservé, marqué supprimé). */
    static async deletePayout(payoutId: number, adminId?: number): Promise<Result> {
        const updated = await prismaDb.organizer_payout.updateMany({
            where: { id: payoutId, is_deleted: false },
            data: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId ?? null },
        });
        if (updated.count === 0) return { ok: false, code: 404, message: 'Reversement introuvable' };
        return { ok: true, body: { id: payoutId } };
    }
}
