/**
 * Règles métier partagées de la billetterie opérée par Adigo
 * (TICKETING_MODULE_PLAN_2026-10.md) — fonctions pures, sans accès base,
 * pour que l'achat, le scan, les statistiques et les tâches planifiées
 * appliquent exactement les mêmes définitions.
 */
import { AmbiguousDateError, parseTimezoneAwareDate } from "../../utils/parseTimezoneAwareDate";

const HOUR_MS = 60 * 60 * 1000;

/** Durée supposée d'un événement sans date de fin explicite. */
export const DEFAULT_EVENT_DURATION_HOURS = 12;
/** Le scan ouvre ce délai avant le début (montage, files d'attente). */
export const SCAN_OPENS_HOURS_BEFORE = 12;
/** Le scan reste ouvert ce délai après la fin ; l'événement passe ensuite en « terminé ». */
export const SCAN_CLOSES_HOURS_AFTER = 6;
/** Un billet Orange Money non payé après ce délai expire et libère sa place (§3.2). */
export const PENDING_PAYMENT_EXPIRY_MINUTES = 30;

export interface EventDates {
    event_date: Date;
    event_end_date?: Date | null;
}

export function eventEnd(e: EventDates): Date {
    return e.event_end_date ?? new Date(e.event_date.getTime() + DEFAULT_EVENT_DURATION_HOURS * HOUR_MS);
}

/** Fin de la fenêtre de scan — c'est aussi le moment où l'événement devient « terminé ». */
export function eventClosesAt(e: EventDates): Date {
    return new Date(eventEnd(e).getTime() + SCAN_CLOSES_HOURS_AFTER * HOUR_MS);
}

export function isScanWindowOpen(e: EventDates, now = new Date()): boolean {
    const opens = new Date(e.event_date.getTime() - SCAN_OPENS_HOURS_BEFORE * HOUR_MS);
    return now >= opens && now <= eventClosesAt(e);
}

export function hasEnded(e: EventDates, now = new Date()): boolean {
    return now > eventEnd(e);
}

/**
 * Montant que l'événement conserve sur un billet : le prix payé, moins ce
 * qui a été remboursé. Un billet jamais payé (en attente, expiré, annulé
 * avant paiement) ne rapporte rien.
 */
export function retainedAmount(t: { payment_status: string | null; total_price: number; refunded_amount: number | null }): number {
    if (t.payment_status === 'paid') return t.total_price;
    if (t.payment_status === 'refunded') return Math.max(0, t.total_price - (t.refunded_amount ?? t.total_price));
    return 0;
}

export function commissionFor(amount: number, rate: number): number {
    return Math.round((amount * rate) / 100);
}

/**
 * Commission Adigo sur un billet. Figée à la vente (`commission_amount`)
 * pour un billet payé ; recalculée sur la part conservée après un
 * remboursement partiel. Les billets vendus avant l'introduction de la
 * commission n'ont pas de taux figé : `fallbackRate` (taux actuel de
 * l'organisateur) s'applique alors.
 */
export function ticketCommission(
    t: { payment_status: string | null; total_price: number; refunded_amount: number | null; commission_rate: unknown; commission_amount: number | null },
    fallbackRate: number,
): number {
    const retained = retainedAmount(t);
    if (retained === 0) return 0;
    const rate = t.commission_rate != null ? Number(t.commission_rate) : fallbackRate;
    if (t.payment_status === 'paid' && t.commission_amount != null) return t.commission_amount;
    return commissionFor(retained, rate);
}

/** Billets qui comptent comme vendus : payés et non annulés. */
export const PAID_TICKET_WHERE = {
    is_deleted: false,
    payment_status: 'paid',
    status: { in: ['confirmed', 'used'] },
};

/**
 * Lit une date ISO 8601 qui porte obligatoirement son fuseau (`Z` ou
 * `+01:00`) — même règle que les trajets (parseTimezoneAwareDate, point 5
 * de UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md) : une date « naïve » est
 * refusée plutôt que devinée.
 */
export function parseZonedDate(value: unknown): Date | null | 'invalid' {
    if (value === undefined || value === null || value === '') return null;
    try {
        return parseTimezoneAwareDate(value, 'date');
    } catch (error) {
        if (error instanceof AmbiguousDateError) return 'invalid';
        throw error;
    }
}

/**
 * Variantes de stockage d'un numéro camerounais (`+237690000000`,
 * `237690000000`, `690000000`) pour retrouver un compte quelle que soit
 * la forme saisie.
 */
export function phoneCandidates(raw: string): string[] {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return [];
    const local = digits.startsWith('237') && digits.length === 12 ? digits.slice(3) : digits;
    return Array.from(new Set([`+237${local}`, `237${local}`, local, raw.trim()]));
}

export function decimalToNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
