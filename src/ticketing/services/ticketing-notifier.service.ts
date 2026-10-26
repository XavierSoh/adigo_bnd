/**
 * Notifications de la billetterie opérée par Adigo
 * (TICKETING_MODULE_PLAN_2026-10.md §3.3 et §5.5).
 *
 * - Emails purement informatifs, dans la langue du destinataire, envoyés
 *   en plus du push et jamais à sa place.
 * - Best-effort, comme toutes les notifications du projet : chaque méthode
 *   attrape ses propres erreurs, un échec d'envoi ne remonte jamais à
 *   l'action qui l'a déclenché. Les appelants n'attendent donc pas le
 *   résultat (`void TicketingNotifier.x(...)`).
 * - Destinataire organisateur : le compte client lié s'il existe (email,
 *   langue, push), sinon l'email de la fiche organisateur.
 */
import prismaDb from "../../config/prismaClient";
import { sendEmail } from "../../services/email.service";
import { NotificationService } from "../../services/notification.service";
import { AdminNotificationService, AdminLabel } from "../../services/adminNotification.service";
import { ticketingInfoEmail, ticketPurchaseConfirmedEmail } from "../../emails/templates";
import { Language } from "../../utils/i18n";

/** Canal Android dédié, créé par l'app (firebase_messaging_service.dart). */
const ANDROID_CHANNEL = 'ticketing_channel';
const MASS_SEND_DELAY_MS = 250;
const TIME_ZONE = 'Africa/Douala';

interface Recipient {
    email: string | null;
    lang: Language;
    name: string;
    customerId: number | null;
    fcmToken: string | null;
    pushEnabled: boolean;
}

const customerSelect = {
    id: true, first_name: true, email: true, preferred_language: true, fcm_token: true, notification_enabled: true,
} as const;

function langOf(value: string | null | undefined): Language {
    return value === 'en' ? 'en' : 'fr';
}

function tr(lang: Language, fr: string, en: string): string {
    return lang === 'en' ? en : fr;
}

function money(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} XAF`;
}

function when(date: Date | null | undefined, lang: Language): string {
    if (!date) return '-';
    return date.toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE,
    });
}

function footer(lang: Language): string {
    return tr(lang,
        "Message d'information de la billetterie ADIGO — aucune action n'est demandée par email.",
        'Information message from ADIGO ticketing — no action is required by email.');
}

async function customerRecipient(customerId: number | null | undefined): Promise<Recipient | null> {
    if (!customerId) return null;
    const c = await prismaDb.customer.findFirst({ where: { id: customerId, is_deleted: false }, select: customerSelect });
    if (!c) return null;
    return {
        email: c.email,
        lang: langOf(c.preferred_language),
        name: c.first_name,
        customerId: c.id,
        fcmToken: c.fcm_token,
        pushEnabled: c.notification_enabled !== false,
    };
}

async function organizerRecipient(organizerId: number): Promise<Recipient | null> {
    const org = await prismaDb.event_organizer.findUnique({
        where: { id: organizerId },
        select: { name: true, email: true, customer_id: true, is_deleted: true },
    });
    if (!org || org.is_deleted) return null;
    const linked = await customerRecipient(org.customer_id);
    return {
        email: linked?.email || org.email,
        lang: linked?.lang ?? 'fr',
        name: org.name,
        customerId: linked?.customerId ?? null,
        fcmToken: linked?.fcmToken ?? null,
        pushEnabled: linked?.pushEnabled ?? false,
    };
}

async function mail(r: Recipient | null, build: (lang: Language) => {
    subject: string; title: string; intro: string; rows?: Array<[string, string]>; note?: string;
}): Promise<void> {
    if (!r?.email) return;
    const c = build(r.lang);
    const content = ticketingInfoEmail(r.lang, { ...c, footer: footer(r.lang) });
    await sendEmail({ to: r.email, ...content });
}

async function push(r: Recipient | null, title: string, body: string, data: Record<string, string>): Promise<void> {
    if (!r?.fcmToken || !r.pushEnabled || !NotificationService.isValidToken(r.fcmToken)) return;
    await NotificationService.sendToDevice(r.fcmToken, { title, body, data, androidChannelId: ANDROID_CHANNEL });
}

async function safely(label: string, fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (error) {
        console.error(`⚠️ TicketingNotifier.${label} failed:`, error);
    }
}

async function sequential<T>(items: T[], fn: (item: T) => Promise<void>): Promise<void> {
    for (const item of items) {
        await fn(item);
        await new Promise((resolve) => setTimeout(resolve, MASS_SEND_DELAY_MS));
    }
}

async function loadEvent(eventId: number) {
    return prismaDb.event.findUnique({
        where: { id: eventId },
        select: {
            id: true, title: true, code: true, event_date: true, venue_name: true, city: true, organizer_id: true,
            event_organizer: { select: { name: true } },
        },
    });
}

async function loadTicket(ticketId: number) {
    return prismaDb.event_ticket.findUnique({
        where: { id: ticketId },
        select: {
            id: true, reference: true, quantity: true, total_price: true, customer_id: true, checked_in_count: true,
            refunded_amount: true,
            event: { select: { id: true, title: true, event_date: true, venue_name: true, city: true } },
            event_ticket_type: { select: { name: true } },
        },
    });
}

async function loadController(controllerId: number) {
    return prismaDb.event_controller.findUnique({
        where: { id: controllerId },
        select: {
            id: true, status: true, customer_id: true, invited_by_customer_id: true, invited_by_user_id: true,
            customer: { select: { first_name: true, last_name: true, phone: true } },
            event: {
                select: {
                    id: true, title: true, event_date: true, venue_name: true, city: true,
                    event_organizer: { select: { name: true } },
                },
            },
        },
    });
}

function eventRows(lang: Language, e: { title: string; event_date: Date; venue_name: string; city: string }): Array<[string, string]> {
    return [
        [tr(lang, 'Événement', 'Event'), e.title],
        [tr(lang, 'Date', 'Date'), when(e.event_date, lang)],
        [tr(lang, 'Lieu', 'Venue'), `${e.venue_name}, ${e.city}`],
    ];
}

export class TicketingNotifier {

    // ─── Organisateur ────────────────────────────────────────────────

    static organizerProfile(organizerId: number, kind: 'created' | 'linked'): Promise<void> {
        return safely('organizerProfile', async () => {
            const r = await organizerRecipient(organizerId);
            await mail(r, (lang) => ({
                subject: tr(lang, 'Vous êtes organisateur sur ADIGO', 'You are now an ADIGO organizer'),
                title: tr(lang, `Bienvenue, ${r!.name}`, `Welcome, ${r!.name}`),
                intro: kind === 'created'
                    ? tr(lang,
                        "L'équipe ADIGO a créé votre fiche organisateur. Nous gérons pour vous la création et la mise en vente de vos événements.",
                        'The ADIGO team created your organizer profile. We handle creating and selling your events for you.')
                    : tr(lang,
                        "Votre compte ADIGO est maintenant lié à votre fiche organisateur.",
                        'Your ADIGO account is now linked to your organizer profile.'),
                note: tr(lang,
                    "Depuis l'app ADIGO (Espace organisateur), vous pouvez suivre vos ventes, vos entrées, votre solde et inviter des contrôleurs pour scanner les billets.",
                    'In the ADIGO app (Organizer space) you can follow your sales, entries and balance, and invite controllers to scan tickets.'),
            }));
        });
    }

    // ─── Événement ───────────────────────────────────────────────────

    static eventPublished(eventId: number): Promise<void> {
        return safely('eventPublished', async () => {
            const [e, types] = await Promise.all([
                loadEvent(eventId),
                prismaDb.event_ticket_type.findMany({ where: { event_id: eventId, is_active: true }, orderBy: { price: 'asc' } }),
            ]);
            if (!e) return;
            const r = await organizerRecipient(e.organizer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, `Votre événement est en vente : ${e.title}`, `Your event is on sale: ${e.title}`),
                title: tr(lang, 'Événement publié', 'Event published'),
                intro: tr(lang,
                    'Votre événement est désormais visible dans l\'app ADIGO et les billets sont en vente.',
                    'Your event is now visible in the ADIGO app and tickets are on sale.'),
                rows: [
                    ...eventRows(lang, e),
                    ...types.map((t): [string, string] => [t.name, `${money(t.price)} · ${t.quantity} ${tr(lang, 'places', 'seats')}`]),
                ],
            }));
            await push(r, tr(r?.lang ?? 'fr', 'Événement publié', 'Event published'), e.title, {
                type: 'ticketing_organizer_event', event_id: String(e.id),
            });
        });
    }

    static eventSalesPaused(eventId: number, paused: boolean, reason?: string | null): Promise<void> {
        return safely('eventSalesPaused', async () => {
            const e = await loadEvent(eventId);
            if (!e) return;
            const r = await organizerRecipient(e.organizer_id);
            await mail(r, (lang) => ({
                subject: paused
                    ? tr(lang, `Ventes suspendues : ${e.title}`, `Sales paused: ${e.title}`)
                    : tr(lang, `Ventes reprises : ${e.title}`, `Sales resumed: ${e.title}`),
                title: paused ? tr(lang, 'Ventes suspendues', 'Sales paused') : tr(lang, 'Ventes reprises', 'Sales resumed'),
                intro: paused
                    ? tr(lang, "La vente de billets est temporairement suspendue. L'événement reste visible dans l'app.",
                        'Ticket sales are temporarily paused. The event remains visible in the app.')
                    : tr(lang, 'La vente de billets a repris.', 'Ticket sales have resumed.'),
                rows: [...eventRows(lang, e), ...(reason ? [[tr(lang, 'Motif', 'Reason'), reason] as [string, string]] : [])],
            }));
        });
    }

    /** `refunds` : un élément par billet payé remboursé lors de l'annulation. */
    static eventCancelled(eventId: number, reason: string, refunds: Array<{ customerId: number; amount: number; reference: string | null }>): Promise<void> {
        return safely('eventCancelled', async () => {
            const e = await loadEvent(eventId);
            if (!e) return;
            const total = refunds.reduce((sum, x) => sum + x.amount, 0);

            const org = await organizerRecipient(e.organizer_id);
            await mail(org, (lang) => ({
                subject: tr(lang, `Événement annulé : ${e.title}`, `Event cancelled: ${e.title}`),
                title: tr(lang, 'Événement annulé', 'Event cancelled'),
                intro: tr(lang, 'Cet événement a été annulé. Les acheteurs ont été remboursés sur leur portefeuille ADIGO.',
                    'This event has been cancelled. Buyers have been refunded to their ADIGO wallet.'),
                rows: [
                    ...eventRows(lang, e),
                    [tr(lang, 'Motif', 'Reason'), reason],
                    [tr(lang, 'Billets remboursés', 'Tickets refunded'), String(refunds.length)],
                    [tr(lang, 'Montant remboursé', 'Amount refunded'), money(total)],
                ],
            }));

            await sequential(refunds, async (refund) => {
                await safely('eventCancelled.buyer', async () => {
                    const r = await customerRecipient(refund.customerId);
                    await mail(r, (lang) => ({
                        subject: tr(lang, `Événement annulé : ${e.title}`, `Event cancelled: ${e.title}`),
                        title: tr(lang, 'Événement annulé', 'Event cancelled'),
                        intro: tr(lang,
                            `Bonjour ${r!.name}, l'événement pour lequel vous aviez un billet a été annulé. Le montant a été remboursé sur votre portefeuille ADIGO.`,
                            `Hi ${r!.name}, the event you had a ticket for has been cancelled. The amount has been refunded to your ADIGO wallet.`),
                        rows: [
                            ...eventRows(lang, e),
                            [tr(lang, 'Motif', 'Reason'), reason],
                            [tr(lang, 'Billet', 'Ticket'), refund.reference ?? '-'],
                            [tr(lang, 'Remboursé', 'Refunded'), money(refund.amount)],
                        ],
                    }));
                    await push(r, tr(r?.lang ?? 'fr', 'Événement annulé', 'Event cancelled'),
                        tr(r?.lang ?? 'fr', `${e.title} — remboursé sur votre portefeuille`, `${e.title} — refunded to your wallet`),
                        { type: 'ticketing_event_cancelled', event_id: String(e.id) });
                });
            });
        });
    }

    static eventCompleted(eventId: number, summary: { paid_seats: number; checked_in: number; gross: number; commission: number; organizer_net: number }): Promise<void> {
        return safely('eventCompleted', async () => {
            const e = await loadEvent(eventId);
            if (!e) return;
            const r = await organizerRecipient(e.organizer_id);
            const rows = (lang: Language): Array<[string, string]> => [
                ...eventRows(lang, e),
                [tr(lang, 'Places vendues', 'Seats sold'), String(summary.paid_seats)],
                [tr(lang, 'Entrées', 'Entries'), String(summary.checked_in)],
                [tr(lang, 'Encaissé', 'Collected'), money(summary.gross)],
                [tr(lang, 'Commission ADIGO', 'ADIGO commission'), money(summary.commission)],
                [tr(lang, 'Votre part', 'Your share'), money(summary.organizer_net)],
            ];
            await mail(r, (lang) => ({
                subject: tr(lang, `Bilan de votre événement : ${e.title}`, `Your event summary: ${e.title}`),
                title: tr(lang, 'Événement terminé', 'Event completed'),
                intro: tr(lang, 'Voici le bilan de votre événement. Votre part vous sera reversée par ADIGO.',
                    'Here is the summary of your event. Your share will be paid out by ADIGO.'),
                rows: rows(lang),
            }));
            await AdminNotificationService.notify({
                lang: 'fr',
                icon: '🏁',
                heading: { fr: 'Événement terminé — part organisateur à reverser', en: 'Event completed — organizer share to pay out' },
                lines: [
                    [AdminLabel.event, e.title],
                    [{ fr: 'Organisateur', en: 'Organizer' }, e.event_organizer?.name ?? '-'],
                    [{ fr: 'Encaissé', en: 'Collected' }, money(summary.gross)],
                    [{ fr: 'Commission', en: 'Commission' }, money(summary.commission)],
                    [{ fr: 'À reverser', en: 'To pay out' }, money(summary.organizer_net)],
                ],
            });
        });
    }

    // ─── Billet (acheteur) ───────────────────────────────────────────

    /** Email existant (ticketPurchaseConfirmedEmail) — wallet immédiat ou Orange Money confirmé. */
    static purchaseConfirmed(ticketId: number): Promise<void> {
        return safely('purchaseConfirmed', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            const r = await customerRecipient(t.customer_id);
            if (!r?.email) return;
            const { subject, html, text } = ticketPurchaseConfirmedEmail(r.lang, {
                firstName: r.name,
                eventTitle: t.event.title,
                quantity: t.quantity,
                totalPrice: t.total_price,
                reference: t.reference || String(t.id),
            });
            await sendEmail({ to: r.email, subject, html, text });
        });
    }

    static ticketExpired(ticketId: number): Promise<void> {
        return safely('ticketExpired', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            const r = await customerRecipient(t.customer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, 'Paiement non abouti — billet non validé', 'Payment not completed — ticket not issued'),
                title: tr(lang, 'Paiement Orange Money expiré', 'Orange Money payment expired'),
                intro: tr(lang,
                    `Bonjour ${r!.name}, le paiement Orange Money de votre billet n'a pas été confirmé à temps. Le billet n'est pas validé et aucun montant n'a été débité.`,
                    `Hi ${r!.name}, the Orange Money payment for your ticket was not confirmed in time. The ticket was not issued and no amount was charged.`),
                rows: [...eventRows(lang, t.event), [tr(lang, 'Référence', 'Reference'), t.reference ?? '-']],
                note: tr(lang, "Vous pouvez acheter un nouveau billet depuis l'app.", 'You can buy a new ticket from the app.'),
            }));
        });
    }

    static ticketScanned(ticketId: number, admitted: number): Promise<void> {
        return safely('ticketScanned', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            const r = await customerRecipient(t.customer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, `Billet scanné : ${t.event.title}`, `Ticket scanned: ${t.event.title}`),
                title: tr(lang, 'Billet scanné à l\'entrée', 'Ticket scanned at entry'),
                intro: tr(lang,
                    `Bonjour ${r!.name}, votre billet vient d'être scanné à l'entrée.`,
                    `Hi ${r!.name}, your ticket was just scanned at the entrance.`),
                rows: [
                    [tr(lang, 'Événement', 'Event'), t.event.title],
                    [tr(lang, 'Heure', 'Time'), when(new Date(), lang)],
                    [tr(lang, 'Personnes admises', 'People admitted'), String(admitted)],
                    [tr(lang, 'Entrées utilisées', 'Entries used'), `${t.checked_in_count} / ${t.quantity}`],
                ],
                note: tr(lang,
                    "Si ce n'était pas vous, votre QR code a peut-être été copié : contactez le support ADIGO.",
                    "If this wasn't you, your QR code may have been copied: contact ADIGO support."),
            }));
        });
    }

    static ticketCancelled(ticketId: number): Promise<void> {
        return safely('ticketCancelled', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            const r = await customerRecipient(t.customer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, 'Billet annulé', 'Ticket cancelled'),
                title: tr(lang, 'Billet annulé', 'Ticket cancelled'),
                intro: tr(lang, `Bonjour ${r!.name}, votre billet a été annulé.`, `Hi ${r!.name}, your ticket has been cancelled.`),
                rows: [...eventRows(lang, t.event), [tr(lang, 'Référence', 'Reference'), t.reference ?? '-']],
            }));
        });
    }

    static ticketRefunded(ticketId: number, amount: number, reason: string): Promise<void> {
        return safely('ticketRefunded', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            const r = await customerRecipient(t.customer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, 'Billet remboursé', 'Ticket refunded'),
                title: tr(lang, 'Remboursement effectué', 'Refund processed'),
                intro: tr(lang,
                    `Bonjour ${r!.name}, votre billet a été remboursé sur votre portefeuille ADIGO.`,
                    `Hi ${r!.name}, your ticket has been refunded to your ADIGO wallet.`),
                rows: [
                    ...eventRows(lang, t.event),
                    [tr(lang, 'Référence', 'Reference'), t.reference ?? '-'],
                    [tr(lang, 'Montant crédité', 'Amount credited'), money(amount)],
                    [tr(lang, 'Motif', 'Reason'), reason],
                ],
            }));
            await push(r, tr(r?.lang ?? 'fr', 'Billet remboursé', 'Ticket refunded'),
                `${t.event.title} — ${money(amount)}`, { type: 'ticketing_ticket_update', ticket_id: String(t.id) });
        });
    }

    static cancellationRequested(ticketId: number, reason: string): Promise<void> {
        return safely('cancellationRequested', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            await AdminNotificationService.notify({
                customerId: t.customer_id,
                icon: '📝',
                heading: { fr: "Demande d'annulation de billet à traiter", en: 'Ticket cancellation request to review' },
                lines: [
                    [AdminLabel.ticket, t.reference ?? String(t.id)],
                    [AdminLabel.event, t.event.title],
                    [AdminLabel.amount, money(t.total_price)],
                    [AdminLabel.reason, reason],
                ],
            });
        });
    }

    static cancellationDecision(ticketId: number, approved: boolean, refundedAmount: number, note?: string | null): Promise<void> {
        return safely('cancellationDecision', async () => {
            const t = await loadTicket(ticketId);
            if (!t) return;
            const r = await customerRecipient(t.customer_id);
            await mail(r, (lang) => ({
                subject: approved
                    ? tr(lang, "Demande d'annulation acceptée", 'Cancellation request approved')
                    : tr(lang, "Demande d'annulation refusée", 'Cancellation request declined'),
                title: approved ? tr(lang, 'Annulation acceptée', 'Cancellation approved') : tr(lang, 'Annulation refusée', 'Cancellation declined'),
                intro: approved
                    ? tr(lang, `Bonjour ${r!.name}, votre demande d'annulation a été acceptée.`, `Hi ${r!.name}, your cancellation request was approved.`)
                    : tr(lang, `Bonjour ${r!.name}, votre demande d'annulation a été refusée. Votre billet reste valable.`,
                        `Hi ${r!.name}, your cancellation request was declined. Your ticket remains valid.`),
                rows: [
                    ...eventRows(lang, t.event),
                    [tr(lang, 'Référence', 'Reference'), t.reference ?? '-'],
                    ...(approved ? [[tr(lang, 'Remboursé sur le portefeuille', 'Refunded to wallet'), money(refundedAmount)] as [string, string]] : []),
                    ...(note ? [[tr(lang, 'Commentaire', 'Comment'), note] as [string, string]] : []),
                ],
            }));
            await push(r,
                approved ? tr(r?.lang ?? 'fr', 'Annulation acceptée', 'Cancellation approved') : tr(r?.lang ?? 'fr', 'Annulation refusée', 'Cancellation declined'),
                t.event.title, { type: 'ticketing_ticket_update', ticket_id: String(t.id) });
        });
    }

    // ─── Contrôleurs ─────────────────────────────────────────────────

    static invitationSent(controllerId: number): Promise<void> {
        return safely('invitationSent', async () => {
            const c = await loadController(controllerId);
            if (!c) return;
            const r = await customerRecipient(c.customer_id);
            const organizer = c.event.event_organizer?.name ?? 'ADIGO';
            await mail(r, (lang) => ({
                subject: tr(lang, `Invitation à contrôler les billets : ${c.event.title}`, `Invitation to scan tickets: ${c.event.title}`),
                title: tr(lang, 'Invitation contrôleur', 'Controller invitation'),
                intro: tr(lang,
                    `Bonjour ${r!.name}, ${organizer} vous invite à contrôler les billets de cet événement.`,
                    `Hi ${r!.name}, ${organizer} invites you to scan tickets for this event.`),
                rows: [...eventRows(lang, c.event), [tr(lang, 'Organisateur', 'Organizer'), organizer]],
                note: tr(lang, "Répondez depuis l'app ADIGO (Mode contrôleur).", 'Reply from the ADIGO app (Controller mode).'),
            }));
            await push(r, tr(r?.lang ?? 'fr', 'Invitation contrôleur', 'Controller invitation'),
                tr(r?.lang ?? 'fr', `${organizer} vous invite à scanner les billets de ${c.event.title}`, `${organizer} invites you to scan tickets for ${c.event.title}`),
                { type: 'ticketing_controller_invite', invitation_id: String(c.id), event_id: String(c.event.id) });
        });
    }

    /** Prévient l'invitant de la réponse (acceptée, refusée ou expirée). */
    static invitationOutcome(controllerId: number): Promise<void> {
        return safely('invitationOutcome', async () => {
            const c = await loadController(controllerId);
            if (!c) return;
            const who = `${c.customer.first_name} ${c.customer.last_name}`.trim();
            const outcome = (lang: Language) => ({
                accepted: tr(lang, 'a accepté', 'accepted'),
                declined: tr(lang, 'a refusé', 'declined'),
                expired: tr(lang, "n'a pas répondu à temps à", 'did not reply in time to'),
            } as Record<string, string>)[c.status] ?? c.status;

            if (c.invited_by_customer_id) {
                const r = await customerRecipient(c.invited_by_customer_id);
                await mail(r, (lang) => ({
                    subject: tr(lang, `Invitation contrôleur : ${who}`, `Controller invitation: ${who}`),
                    title: tr(lang, 'Réponse à votre invitation', 'Reply to your invitation'),
                    intro: tr(lang, `${who} ${outcome(lang)} votre invitation à contrôler les billets.`,
                        `${who} ${outcome(lang)} your invitation to scan tickets.`),
                    rows: [...eventRows(lang, c.event), [tr(lang, 'Contrôleur', 'Controller'), `${who} (${c.customer.phone ?? '-'})`]],
                }));
                await push(r, tr(r?.lang ?? 'fr', 'Invitation contrôleur', 'Controller invitation'),
                    `${who} ${outcome(r?.lang ?? 'fr')} — ${c.event.title}`,
                    { type: 'ticketing_controller_response', event_id: String(c.event.id) });
            } else if (c.invited_by_user_id) {
                await AdminNotificationService.notify({
                    lang: 'fr',
                    icon: '🎫',
                    heading: { fr: 'Réponse à une invitation contrôleur', en: 'Controller invitation reply' },
                    lines: [
                        [AdminLabel.event, c.event.title],
                        [{ fr: 'Contrôleur', en: 'Controller' }, `${who} (${c.customer.phone ?? '-'})`],
                        [{ fr: 'Réponse', en: 'Reply' }, outcome('fr')],
                    ],
                });
            }
        });
    }

    static controllerRevoked(controllerId: number): Promise<void> {
        return safely('controllerRevoked', async () => {
            const c = await loadController(controllerId);
            if (!c) return;
            const r = await customerRecipient(c.customer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, `Accès contrôleur retiré : ${c.event.title}`, `Controller access removed: ${c.event.title}`),
                title: tr(lang, 'Accès contrôleur retiré', 'Controller access removed'),
                intro: tr(lang, `Bonjour ${r!.name}, vous ne pouvez plus scanner les billets de cet événement.`,
                    `Hi ${r!.name}, you can no longer scan tickets for this event.`),
                rows: eventRows(lang, c.event),
            }));
            await push(r, tr(r?.lang ?? 'fr', 'Accès contrôleur retiré', 'Controller access removed'), c.event.title,
                { type: 'ticketing_controller_revoked', event_id: String(c.event.id) });
        });
    }

    // ─── Reversement ─────────────────────────────────────────────────

    static payoutRecorded(payoutId: number, balanceDueAfter: number): Promise<void> {
        return safely('payoutRecorded', async () => {
            const p = await prismaDb.organizer_payout.findUnique({
                where: { id: payoutId },
                include: { event: { select: { title: true } } },
            });
            if (!p) return;
            const methods: Record<string, [string, string]> = {
                orange_money: ['Orange Money', 'Orange Money'],
                mtn_momo: ['MTN Mobile Money', 'MTN Mobile Money'],
                bank_transfer: ['Virement bancaire', 'Bank transfer'],
                cash: ['Espèces', 'Cash'],
                other: ['Autre', 'Other'],
            };
            const r = await organizerRecipient(p.organizer_id);
            await mail(r, (lang) => ({
                subject: tr(lang, `Reversement ADIGO : ${money(p.amount)}`, `ADIGO payout: ${money(p.amount)}`),
                title: tr(lang, 'Reversement effectué', 'Payout made'),
                intro: tr(lang, 'ADIGO vous a reversé votre part sur les ventes de billets.', 'ADIGO has paid out your share of ticket sales.'),
                rows: [
                    [tr(lang, 'Montant', 'Amount'), money(p.amount)],
                    [tr(lang, 'Moyen', 'Method'), (methods[p.method] ?? [p.method, p.method])[lang === 'en' ? 1 : 0]],
                    ...(p.reference ? [[tr(lang, 'Référence', 'Reference'), p.reference] as [string, string]] : []),
                    ...(p.event ? [[tr(lang, 'Événement', 'Event'), p.event.title] as [string, string]] : []),
                    [tr(lang, 'Date', 'Date'), when(p.paid_at, lang)],
                    [tr(lang, 'Solde restant dû', 'Remaining balance'), money(Math.max(0, balanceDueAfter))],
                ],
            }));
            await push(r, tr(r?.lang ?? 'fr', 'Reversement effectué', 'Payout made'), money(p.amount),
                { type: 'ticketing_organizer_payout' });
        });
    }
}
