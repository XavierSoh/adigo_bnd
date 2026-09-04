// Internal admin email notifications for business-significant events on
// booking, ticketing, and payments (created/cancelled/paid...) - separate
// from the customer-facing emails in emails/templates.ts. Requested by the
// user: ADIGO's own administration should get an email whenever something
// important happens on these three modules, in addition to whatever the
// customer already receives (push/email) - in the SAME language as that
// customer (their explicit choice over a fixed French-only internal email).
//
// Best-effort like every other notification in this codebase: a failure
// here must never block the booking/ticket/payment operation itself.
import prismaDb from "../config/prismaClient";
import { sendEmail } from "./email.service";
import { adminNotificationEmail } from "../emails/templates";
import { Language } from "../utils/i18n";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "contact@adigolimited.com";

export interface BilingualText {
    fr: string;
    en: string;
}

function pick(lang: Language, text: BilingualText): string {
    return lang === 'en' ? text.en : text.fr;
}

async function resolveLanguage(customerId: number): Promise<Language> {
    try {
        const customer = await prismaDb.customer.findUnique({
            where: { id: customerId },
            select: { preferred_language: true },
        });
        return customer?.preferred_language === 'en' ? 'en' : 'fr';
    } catch {
        return 'fr';
    }
}

/** Common bilingual field labels, reused across call sites instead of each one re-typing {fr, en}. */
export const AdminLabel = {
    customerId: { fr: 'Client (id)', en: 'Customer (id)' } as BilingualText,
    customerName: { fr: 'Client', en: 'Customer' } as BilingualText,
    customerPhone: { fr: 'Téléphone', en: 'Phone' } as BilingualText,
    customerEmail: { fr: 'Email', en: 'Email' } as BilingualText,
    seats: { fr: 'Sièges', en: 'Seats' } as BilingualText,
    seatNumbers: { fr: 'N° de sièges', en: 'Seat number(s)' } as BilingualText,
    totalAmount: { fr: 'Montant total', en: 'Total amount' } as BilingualText,
    amount: { fr: 'Montant', en: 'Amount' } as BilingualText,
    payment: { fr: 'Paiement', en: 'Payment' } as BilingualText,
    booking: { fr: 'Réservation', en: 'Booking' } as BilingualText,
    trip: { fr: 'Trajet', en: 'Trip' } as BilingualText,
    tripDate: { fr: 'Date du trajet', en: 'Trip date' } as BilingualText,
    reason: { fr: 'Motif', en: 'Reason' } as BilingualText,
    group: { fr: 'Groupe', en: 'Group' } as BilingualText,
    ticket: { fr: 'Billet', en: 'Ticket' } as BilingualText,
    event: { fr: 'Événement', en: 'Event' } as BilingualText,
    quantity: { fr: 'Quantité', en: 'Quantity' } as BilingualText,
    reference: { fr: 'Référence', en: 'Reference' } as BilingualText,
    purpose: { fr: 'Motif', en: 'Reason' } as BilingualText,
};

export class AdminNotificationService {
    /**
     * `lang` skips the DB lookup when the caller already knows the
     * customer's language (e.g. it's already resolved a few lines above
     * for the customer-facing email) - otherwise pass `customerId` and
     * this resolves it from `customer.preferred_language`, same source
     * every other bilingual template in this codebase uses.
     */
    static async notify(params: {
        customerId?: number;
        lang?: Language;
        icon?: string;
        heading: BilingualText;
        lines: Array<[BilingualText, string]>;
    }): Promise<void> {
        try {
            const lang = params.lang ?? (params.customerId ? await resolveLanguage(params.customerId) : 'fr');
            const heading = pick(lang, params.heading);
            const lines: Array<[string, string]> = params.lines.map(([label, value]) => [pick(lang, label), value]);
            const { subject, html, text } = adminNotificationEmail(lang, { icon: params.icon, heading, lines });
            await sendEmail({ to: ADMIN_EMAIL, subject, html, text });
        } catch (error) {
            console.error(`⚠️ Warning: admin notification email failed:`, error);
        }
    }
}
