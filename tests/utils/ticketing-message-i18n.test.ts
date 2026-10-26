import { ticketingMessageToEnglish, wantsEnglish } from '../../src/ticketing/utils/message-i18n';

const req = (opts: { header?: string; query?: string; body?: Record<string, unknown> }) => ({
    headers: opts.header ? { 'accept-language': opts.header } : {},
    query: opts.query ? { lang: opts.query } : {},
    body: opts.body ?? {},
}) as any;

describe('message-i18n — langue demandée', () => {
    it('anglais seulement sur demande explicite', () => {
        expect(wantsEnglish(req({ header: 'en' }))).toBe(true);
        expect(wantsEnglish(req({ header: 'en-US,en;q=0.9' }))).toBe(true);
        expect(wantsEnglish(req({ query: 'en' }))).toBe(true);
        expect(wantsEnglish(req({ body: { lang: 'en' } }))).toBe(true);
        expect(wantsEnglish(req({ header: 'fr' }))).toBe(false);
        // Sans indication (adigo2) : on garde le français.
        expect(wantsEnglish(req({}))).toBe(false);
    });
});

describe('message-i18n — traductions', () => {
    it('messages fixes', () => {
        expect(ticketingMessageToEnglish("Cette personne doit d'abord créer un compte ADIGO"))
            .toBe('This person must create an ADIGO account first');
        expect(ticketingMessageToEnglish('Billet déjà utilisé')).toBe('Ticket already used');
        expect(ticketingMessageToEnglish('Événement introuvable')).toBe('Event not found');
    });

    it('messages avec valeurs', () => {
        expect(ticketingMessageToEnglish('2 personne(s) admise(s)')).toBe('2 person(s) admitted');
        expect(ticketingMessageToEnglish('Nombre de personnes invalide (1 à 3)')).toBe('Invalid number of people (1 to 3)');
        expect(ticketingMessageToEnglish('Solde du portefeuille insuffisant (disponible: 1000, requis: 5000)'))
            .toBe('Insufficient wallet balance (available: 1000, required: 5000)');
        expect(ticketingMessageToEnglish('Annulation acceptée — 12000 XAF remboursés sur le portefeuille'))
            .toBe('Cancellation approved — 12000 XAF refunded to the wallet');
        expect(ticketingMessageToEnglish('Billet pour un autre événement : Concert'))
            .toBe('Ticket for another event: Concert');
    });

    it('erreurs de validation jointes, libellés traduits', () => {
        expect(ticketingMessageToEnglish('Titre est obligatoire · Billet 2 — Prix doit être au moins 0'))
            .toBe('Title is required · Ticket 2 — Price must be at least 0');
        expect(ticketingMessageToEnglish("Le motif d'annulation est obligatoire")).toBe('The cancellation reason is required');
    });

    it('un message inconnu reste tel quel', () => {
        expect(ticketingMessageToEnglish('Message sans traduction')).toBe('Message sans traduction');
    });
});
