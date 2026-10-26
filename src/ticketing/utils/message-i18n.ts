/**
 * Messages de la billetterie en anglais.
 *
 * Les services de la billetterie écrivent leurs messages en français. Ce
 * module les traduit au moment de répondre, quand le client a demandé
 * l'anglais EXPLICITEMENT (en-tête Accept-Language, `lang` en query ou dans
 * le corps) : la langue par défaut du backend est l'anglais, et adigo2
 * n'envoyait pas d'en-tête — sans cette précaution, un écran français
 * recevrait des messages anglais.
 *
 * Un message sans traduction connue reste en français ; les erreurs de
 * validation jointes par « · » sont traduites une à une.
 */
import { NextFunction, Request, Response } from 'express';

const EXACT: Record<string, string> = {
    // Accès
    'Accès refusé': 'Access denied',
    'Réservé aux comptes clients': 'Customer accounts only',
    "Vous n'êtes pas contrôleur de cet événement": 'You are not a controller for this event',
    "Ce compte n'est lié à aucun organisateur": 'This account is not linked to any organizer',
    'Erreur serveur': 'Server error',
    'Image refusée': 'Image rejected',

    // Lectures (messages de succès)
    'Rôles billetterie': 'Ticketing roles',
    "Événements de l'organisateur": "Organizer's events",
    "Détail de l'événement": 'Event details',
    "Solde de l'organisateur": 'Organizer balance',
    'Contrôleurs': 'Controllers',
    'Invitations en attente': 'Pending invitations',
    'Événements à contrôler': 'Events to check',
    'Résultat du scan': 'Scan result',
    'Événements': 'Events',
    'Billets': 'Tickets',
    'Organisateurs': 'Organizers',
    'Profil organisateur': 'Organizer profile',
    'Soldes des organisateurs': 'Organizer balances',
    'Reversements': 'Payouts',
    "Demandes d'annulation": 'Cancellation requests',
    'Commission': 'Commission',
    'Statistiques récupérées': 'Statistics retrieved',
    'Statut favori récupéré': 'Favorite status retrieved',

    // Actions réussies
    'Invitation envoyée': 'Invitation sent',
    'Invitation acceptée': 'Invitation accepted',
    'Invitation refusée': 'Invitation declined',
    'Accès révoqué': 'Access revoked',
    'Brouillon créé': 'Draft created',
    'Brouillon supprimé': 'Draft deleted',
    'Événement mis à jour': 'Event updated',
    'Événement publié': 'Event published',
    'Événement annulé': 'Event cancelled',
    'Organisateur créé': 'Organizer created',
    'Organisateur mis à jour': 'Organizer updated',
    'Organisateur supprimé': 'Organizer deleted',
    'Type de billet ajouté': 'Ticket type added',
    'Type de billet mis à jour': 'Ticket type updated',
    'Type de billet supprimé': 'Ticket type deleted',
    'Reversement enregistré': 'Payout recorded',
    'Reversement annulé': 'Payout cancelled',
    'Taux de commission mis à jour': 'Commission rate updated',
    'Image enregistrée': 'Image saved',
    'Annulation acceptée': 'Cancellation approved',
    'Demande refusée': 'Request rejected',
    "Demande d'annulation envoyée — ADIGO vous répondra rapidement": 'Cancellation request sent — ADIGO will get back to you shortly',
    'Billet annulé': 'Ticket cancelled',
    'Paiement Orange Money initié - confirmez sur votre téléphone': 'Orange Money payment started — confirm it on your phone',
    'Paiement cash confirmé (billet)': 'Cash payment confirmed (ticket)',

    // Introuvables
    'Événement introuvable': 'Event not found',
    'Événement non trouvé': 'Event not found',
    'Organisateur introuvable': 'Organizer not found',
    'Type de billet introuvable': 'Ticket type not found',
    'Billet introuvable': 'Ticket not found',
    'Ticket non trouvé': 'Ticket not found',
    'Client introuvable': 'Customer not found',
    'Compte client introuvable': 'Customer account not found',
    'Catégorie introuvable': 'Category not found',
    'Invitation introuvable': 'Invitation not found',
    'Invitation introuvable ou déjà close': 'Invitation not found or already closed',
    'Reversement introuvable': 'Payout not found',

    // Achat
    'Quantité invalide': 'Invalid quantity',
    'Type de billet invalide pour cet événement': 'Invalid ticket type for this event',
    "Cet événement n'est pas en vente": 'This event is not on sale',
    'Cet événement est terminé': 'This event is over',
    'Les ventes sont suspendues pour cet événement': 'Sales are paused for this event',
    'Les inscriptions sont closes pour cet événement': 'Registration is closed for this event',
    "Ce type de billet n'est plus en vente": 'This ticket type is no longer on sale',
    'Ce type de billet est complet': 'This ticket type is sold out',
    "La vente de ce billet n'a pas encore commencé": 'Sales for this ticket have not started yet',
    'La vente de ce billet est terminée': 'Sales for this ticket have ended',
    "Erreur lors de l'achat": 'Purchase failed',
    'Moyen de paiement invalide': 'Invalid payment method',
    "Le paiement en espèces n'est possible qu'au guichet.": 'Cash payment is only possible at the counter.',
    "MTN Mobile Money n'est pas encore disponible. Utilisez le portefeuille ou Orange Money.":
        'MTN Mobile Money is not available yet. Use your wallet or Orange Money.',
    'subscriber_msisdn est requis pour un paiement Orange Money': 'subscriber_msisdn is required for an Orange Money payment',
    'event_id, ticket_type_id, customer_id, quantity et payment_method sont requis':
        'event_id, ticket_type_id, customer_id, quantity and payment_method are required',
    'QR code invalide': 'Invalid QR code',

    // Annulation par le client
    'Indiquez le motif de votre demande': 'Please give the reason for your request',
    'Une demande d\'annulation est déjà en cours pour ce billet': 'A cancellation request is already pending for this ticket',
    "Ce billet a déjà été utilisé à l'entrée": 'This ticket has already been used at the entrance',
    'Ce billet ne peut pas être annulé': 'This ticket cannot be cancelled',
    "Ce billet vient de changer d'état, réessayez": 'This ticket has just changed, please try again',
    "Aucune demande d'annulation en attente pour ce billet": 'No pending cancellation request for this ticket',
    'Indiquez le motif du refus': 'Please give the reason for the rejection',
    "Côté admin, utilisez le remboursement ou la décision sur la demande d'annulation":
        'Admins: use the refund or the decision on the cancellation request',

    // Contrôleurs et scan
    "Indiquez le numéro de téléphone ou l'email du compte ADIGO à inviter": 'Enter the phone number or email of the ADIGO account to invite',
    "Cette personne doit d'abord créer un compte ADIGO": 'This person must create an ADIGO account first',
    'Cette personne est déjà contrôleur de cet événement': 'This person is already a controller for this event',
    'Cette personne a déjà une invitation en attente': 'This person already has a pending invitation',
    "L'organisateur peut déjà scanner les billets de ses événements": "The organizer can already scan tickets for their events",
    "Impossible d'inviter des contrôleurs sur un événement terminé ou annulé": 'Cannot invite controllers to an event that is over or cancelled',
    'Cet événement est terminé ou annulé': 'This event is over or cancelled',
    "Cette invitation n'est plus en attente": 'This invitation is no longer pending',
    'event_id et qr_code sont requis': 'event_id and qr_code are required',
    'QR code inconnu': 'Unknown QR code',
    'Billet valide': 'Valid ticket',
    'Billet déjà utilisé': 'Ticket already used',
    'Billet non payé': 'Ticket not paid',
    'Billet annulé ou remboursé': 'Ticket cancelled or refunded',
    'Cet événement est annulé': 'This event is cancelled',
    "Le contrôle des billets n'est pas ouvert pour cet événement": 'Ticket checking is not open for this event',
    'Ce billet vient d\'être scanné par un autre contrôleur': 'This ticket has just been scanned by another controller',

    // Remboursement
    'Seul un billet payé peut être remboursé': 'Only a paid ticket can be refunded',
    'Billet déjà remboursé': 'Ticket already refunded',
    'Erreur lors du remboursement': 'Refund failed',

    // Gestion (adigo2)
    'Ajoutez au moins un type de billet actif avant de publier': 'Add at least one active ticket type before publishing',
    'Seul un brouillon peut être publié': 'Only a draft can be published',
    "Seul un brouillon peut être supprimé — annulez l'événement sinon": 'Only a draft can be deleted — cancel the event instead',
    'Seul un événement publié en vente peut être suspendu': 'Only a published event on sale can be paused',
    'Les ventes de cet événement ne sont pas suspendues': 'Sales for this event are not paused',
    'Cet événement ne peut pas être annulé (déjà annulé ou terminé)': 'This event cannot be cancelled (already cancelled or over)',
    'Cet événement a des billets : annulez-le plutôt que de le supprimer': 'This event has tickets: cancel it instead of deleting it',
    "Cet événement vient d'être modifié": 'This event has just been modified',
    'Un événement annulé ou terminé ne peut plus être modifié': 'A cancelled or finished event can no longer be modified',
    'Événement annulé ou terminé': 'Event cancelled or over',
    "Le motif d'annulation est obligatoire": 'The cancellation reason is required',
    "La date de l'événement est déjà passée": 'The event date has already passed',
    'La date de fin doit être après la date de début': 'The end date must be after the start date',
    'La fin de vente doit être après le début de vente': 'The sale end must be after the sale start',
    "L'organisateur ne peut être changé que sur un brouillon": 'The organizer can only be changed on a draft',
    "L'organisateur de cet événement a été supprimé": "This event's organizer has been deleted",
    'Deux types de billet ne peuvent pas avoir le même nom': 'Two ticket types cannot have the same name',
    'Un type de billet porte déjà ce nom pour cet événement': 'A ticket type with this name already exists for this event',
    'Ce type de billet a déjà des ventes : désactivez-le plutôt': 'This ticket type already has sales: deactivate it instead',
    'Cet organisateur a encore des événements en brouillon ou en vente': 'This organizer still has draft or on-sale events',
    "Cet événement n'appartient pas à cet organisateur": 'This event does not belong to this organizer',
    "Type d'organisateur invalide": 'Invalid organizer type',
    'Email invalide': 'Invalid email',
    'Le taux doit être compris entre 0 et 100': 'The rate must be between 0 and 100',
    'Aucune image reçue (champ « image »)': 'No image received ("image" field)',
    'event_id et une note de 1 à 5 sont requis': 'event_id and a rating from 1 to 5 are required',
};

/** Libellés de champ des erreurs de validation (utils/input.ts). */
const LABELS: Record<string, string> = {
    'Adresse': 'Address',
    'Catégorie': 'Category',
    'Compte client': 'Customer account',
    'Conditions': 'Terms',
    'Coordonnées de reversement': 'Payout details',
    'Date de début': 'Start date',
    'Date de fin': 'End date',
    'Date du reversement': 'Payout date',
    "Date limite d'inscription": 'Registration deadline',
    'Description': 'Description',
    'Email du contact': 'Contact email',
    'Email': 'Email',
    'Image de couverture': 'Cover image',
    'Lien Maps': 'Maps link',
    'Lieu': 'Venue',
    'Logo': 'Logo',
    'Montant': 'Amount',
    'Moyen de paiement': 'Payment method',
    'Nom du contact': 'Contact name',
    'Nom': 'Name',
    'Notes': 'Notes',
    'Organisateur': 'Organizer',
    "Politique d'annulation": 'Cancellation policy',
    'Politique de remboursement': 'Refund policy',
    'Référence': 'Reference',
    'Taux de commission': 'Commission rate',
    'Titre': 'Title',
    'Type': 'Type',
    'Téléphone du contact': 'Contact phone',
    'Téléphone': 'Phone',
    'Ville': 'City',
    'Événement': 'Event',
    'Début de vente': 'Sale start',
    'Fin de vente': 'Sale end',
    'Maximum par commande': 'Maximum per order',
    'Nom du billet': 'Ticket name',
    'Prix': 'Price',
    'Quantité': 'Quantity',
};

/** « Billet 2 — Prix » → « Ticket 2 — Price ». */
function label(raw: string): string {
    const m = raw.match(/^Billet (\d+) — (.+)$/);
    if (m) return `Ticket ${m[1]} — ${LABELS[m[2]] ?? m[2]}`;
    return LABELS[raw] ?? raw;
}

const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    // Validation (utils/input.ts)
    [/^(.+) est obligatoire$/, (m) => `${label(m[1])} is required`],
    [/^(.+) doit être un texte$/, (m) => `${label(m[1])} must be text`],
    [/^(.+) doit être un nombre entier$/, (m) => `${label(m[1])} must be a whole number`],
    [/^(.+) doit être un nombre$/, (m) => `${label(m[1])} must be a number`],
    [/^(.+) doit être au moins (.+)$/, (m) => `${label(m[1])} must be at least ${m[2]}`],
    [/^(.+) doit être au plus (.+)$/, (m) => `${label(m[1])} must be at most ${m[2]}`],
    [/^(.+) doit être compris entre (.+) et (.+)$/, (m) => `${label(m[1])} must be between ${m[2]} and ${m[3]}`],
    [/^(.+) doit être une liste de textes$/, (m) => `${label(m[1])} must be a list of texts`],
    [/^(.+) : (\d+) caractères maximum$/, (m) => `${label(m[1])}: ${m[2]} characters maximum`],
    [/^(.+) : date ISO 8601 avec fuseau horaire attendue \(ex\. (.+)\)$/,
        (m) => `${label(m[1])}: ISO 8601 date with time zone expected (e.g. ${m[2]})`],
    [/^Billet (\d+) — La fin de vente doit être après le début de vente$/,
        (m) => `Ticket ${m[1]} — The sale end must be after the sale start`],

    // Messages avec valeurs
    [/^Maximum (\d+) billets par commande$/, (m) => `Maximum ${m[1]} tickets per order`],
    [/^Solde du portefeuille insuffisant \(disponible: (.+), requis: (.+)\)$/,
        (m) => `Insufficient wallet balance (available: ${m[1]}, required: ${m[2]})`],
    [/^Nombre de personnes invalide \(1 à (\d+)\)$/, (m) => `Invalid number of people (1 to ${m[1]})`],
    [/^(\d+) personne\(s\) admise\(s\)$/, (m) => `${m[1]} person(s) admitted`],
    [/^Billet pour un autre événement : (.+)$/, (m) => `Ticket for another event: ${m[1]}`],
    [/^Annulation acceptée — (.+) XAF remboursés sur le portefeuille$/, (m) => `Cancellation approved — ${m[1]} XAF refunded to the wallet`],
    [/^Montant invalide \(entre 0 et (.+)\)$/, (m) => `Invalid amount (between 0 and ${m[1]})`],
    [/^Le montant dépasse le solde dû \((.+) XAF\)$/, (m) => `The amount exceeds the balance due (${m[1]} XAF)`],
    [/^Il reste (.+) XAF à reverser à cet organisateur$/, (m) => `${m[1]} XAF still has to be paid out to this organizer`],
    [/^La quantité ne peut pas être inférieure aux (\d+) place\(s\) déjà réservée\(s\)$/,
        (m) => `The quantity cannot be lower than the ${m[1]} seat(s) already reserved`],
    [/^Ce compte est déjà lié à l'organisateur « (.+) »$/, (m) => `This account is already linked to the organizer "${m[1]}"`],
    [/^Événement annulé — (\d+) billet\(s\) remboursé\(s\)$/, (m) => `Event cancelled — ${m[1]} ticket(s) refunded`],
    [/^Événement annulé — (\d+) remboursement\(s\) en échec, à reprendre depuis Transactions$/,
        (m) => `Event cancelled — ${m[1]} refund(s) failed, to be retried from Transactions`],
];

function translateOne(message: string): string {
    const exact = EXACT[message];
    if (exact) return exact;
    for (const [re, build] of PATTERNS) {
        const m = message.match(re);
        if (m) return build(m);
    }
    return message;
}

export function ticketingMessageToEnglish(message: string): string {
    return message.split(' · ').map(translateOne).join(' · ');
}

/** L'anglais a-t-il été demandé explicitement ? (voir l'en-tête du fichier) */
export function wantsEnglish(req: Request): boolean {
    const explicit = (req.query?.lang as string | undefined)
        ?? (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).lang as string | undefined : undefined)
        ?? (req.headers['accept-language'] ?? '').split(',')[0].split('-')[0].trim();
    return (explicit ?? '').toLowerCase() === 'en';
}

function withEnglishMessage<T>(value: T): T {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const v = value as Record<string, unknown>;
    return typeof v.message === 'string' ? { ...v, message: ticketingMessageToEnglish(v.message) } as T : value;
}

/**
 * Traduit le champ `message` des réponses JSON quand l'anglais est demandé —
 * celui de l'enveloppe et celui du corps (résultat de scan :
 * `{ body: { result, message, ... } }`).
 */
export function localizeTicketingMessages(req: Request, res: Response, next: NextFunction): void {
    if (wantsEnglish(req)) {
        const json = res.json.bind(res);
        res.json = ((payload: unknown) => {
            const out = withEnglishMessage(payload);
            if (out && typeof out === 'object' && 'body' in (out as object)) {
                const o = out as Record<string, unknown>;
                return json({ ...o, body: withEnglishMessage(o.body) });
            }
            return json(out);
        }) as Response['json'];
    }
    next();
}
