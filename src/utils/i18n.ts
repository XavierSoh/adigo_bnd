/**
 * Système de traduction i18n (internationalisation)
 * Support: Anglais (par défaut) et Français
 */

export type Language = 'en' | 'fr';

export interface Translations {
    [key: string]: string | Translations;
}

/**
 * Traductions pour l'authentification et les messages généraux
 */
const translations: Record<Language, Translations> = {
    en: {
        // Common
        server_error: 'Server error',
        invalid_id: 'Invalid ID',

        // Authentication - Users
        user_created: 'User created successfully',
        user_login_success: 'Login successful',
        user_login_failed: 'Invalid credentials',
        user_updated: 'User updated successfully',
        user_deleted: 'User deleted successfully',
        user_restored: 'User restored successfully',
        user_not_found: 'User not found',
        user_list_retrieved: 'User list retrieved',

        // Authentication - Customers
        customer_created: 'Customer registered successfully',
        customer_login_success: 'Login successful',
        customer_login_failed: 'Invalid email/phone or password',
        customer_updated: 'Customer updated successfully',
        customer_deleted: 'Customer deleted successfully',
        customer_restored: 'Customer restored successfully',
        customer_not_found: 'Customer not found',
        customer_list_retrieved: 'Customer list retrieved',
        customer_found: 'Customer found',
        customer_fetch_error: 'Error retrieving customer',
        wallet_balance_retrieved: 'Balance retrieved',
        wallet_balance_fetch_error: 'Error retrieving balance',

        // Validation
        required_fields: 'Required fields are missing',
        invalid_email: 'Invalid email format',
        email_or_phone_required: 'Email or phone number is required',
        password_required: 'Password is required',
        email_phone_password_required: 'Email/Phone and password are required',
        first_name_required: 'First name is required',
        last_name_required: 'Last name is required',
        email_required: 'Email is required',
        phone_required: 'Phone number is required',
        name_email_phone_password_required: 'First name, last name, email, phone and password are required',

        // Customer specific
        loyalty_points_updated: 'Loyalty points updated',
        email_verified: 'Email verified successfully',
        phone_verified: 'Phone verified successfully',
        statistics_retrieved: 'Statistics retrieved',
        customers_bulk_created: 'customers created successfully',
        each_customer_required_fields: 'Each customer must have first name, last name, email, phone and password',
        invalid_email_for: 'Invalid email format for',
        customer_list_required: 'Customer list is required',
        id_and_points_required: 'ID and points are required',
        search_results: 'search results found',

        // Booking & Trip
        booking_created: 'Booking created successfully',
        bookings_created: 'Bookings created successfully',
        booking_not_found: 'Booking not found',
        trip_not_found: 'Trip not found',
        seat_not_available: 'Seat not available',
        seat_already_booked: 'Seat {{seat}} is already booked',
        this_seat_already_booked: 'This seat is already booked for this trip',
        insufficient_wallet_balance: 'Insufficient wallet balance. Current balance: {{current}} XAF, Required: {{required}} XAF',
        wallet_deduction_error: 'Error deducting wallet balance',
        bookings_created_wallet_error: 'Bookings created but error deducting wallet balance',
        booking_error: 'Error creating booking',
        trip_id_required: 'trip_id is required',
        seat_id_required: 'seat_id is required',
        trip_seat_id_required: 'trip_id and seat_id are required',
        booking_ids_required: 'booking_ids (array) is required',
        cancellation_reason_required: 'cancellation_reason is required',
        bookings_array_required: 'bookings (array) is required',
        date_range_required: 'start_date and end_date or date are required',
        unauthorized: 'Unauthorized',
        cannot_cancel_booking: 'This booking cannot be cancelled',
        booking_own_account_only: 'You can only book for your own account',
        booking_create_fields_required: 'generated_trip_id, customer_id and generated_trip_seat_id are required',
        orange_money_booking_fields_required: 'generated_trip_id, generated_trip_seat_id, total_price and subscriber_msisdn are required',
        orange_money_number_required: "The customer's Orange Money number is required (none saved on their profile)",
        mtn_momo_unavailable: 'MTN Mobile Money is not yet available. Choose Orange Money, the Adigo wallet, or cash payment.',
        booking_updated: 'Booking updated successfully',
        bookings_cancelled: 'Bookings cancelled successfully',
        booking_deleted: 'Booking deleted successfully',
        booking_permanently_deleted: 'Booking permanently deleted',
        booking_restored: 'Booking restored successfully',
        booking_or_already_active: 'Booking not found or already active',
        booking_or_already_deleted: 'Booking not found or already deleted',
        bookings_fetch_error: 'Error retrieving bookings',
        booking_update_error: 'Error updating booking',
        booking_delete_error: 'Error deleting booking',
        booking_restore_error: 'Error restoring booking',
        booking_cancel_error: 'Error cancelling bookings',
        seat_availability_checked: 'Availability checked',
        seat_availability_check_error: 'Error checking seat availability',
        booked_seats_retrieved: 'Booked seats retrieved',
        search_completed: 'Search completed',
        cleanup_done: 'Cleanup completed',
        cleanup_error: 'Error during cleanup',
        bookings_list_retrieved: 'Booking list retrieved',
        bookings_with_details_retrieved: 'Booking list with details retrieved',
        bookings_group_retrieved: 'Group booking list retrieved',
        booking_found: 'Booking found',
        recent_bookings_retrieved: 'Recent bookings retrieved',
        booking_pending_orange_money_confirmation: 'Booking pending — confirm the payment on your phone',
        cannot_modify_booking: 'This booking cannot be modified',
        booking_modified: 'Booking modified successfully',
        too_close_to_departure: 'Cannot modify: departure is less than 2 hours away',
        seat_not_found: 'Seat not found',

        // Push notifications (booking module)
        push_booking_confirmed_title: 'Booking confirmed',
        push_booking_confirmed_body: 'Your booking {{reference}} for {{departure}} → {{arrival}} is confirmed.',
        push_booking_cancelled_title: 'Booking cancelled',
        push_booking_cancelled_body: 'Your booking {{reference}} for {{departure}} → {{arrival}} has been cancelled.',
        push_refund_credited_title: 'Refund credited',
        push_refund_credited_body: '{{amount}} XAF has been credited to your Adigo wallet. New balance: {{balance}} XAF.',
        push_trip_reminder_title: 'Your trip is coming up',
        push_trip_reminder_body: 'Your trip {{departure}} → {{arrival}} departs in {{minutes}} min (at {{time}}). Seat {{seat}}.',

        // Status
        status_active: 'active',
        status_suspended: 'suspended',
        status_pending: 'pending',

        // Tiers
        tier_regular: 'regular',
        tier_silver: 'silver',
        tier_gold: 'gold',
    },

    fr: {
        // Commun
        server_error: 'Erreur serveur',
        invalid_id: 'ID invalide',

        // Authentification - Users
        user_created: 'Utilisateur créé avec succès',
        user_login_success: 'Connexion réussie',
        user_login_failed: 'Identifiants invalides',
        user_updated: 'Utilisateur mis à jour',
        user_deleted: 'Utilisateur supprimé',
        user_restored: 'Utilisateur restauré',
        user_not_found: 'Utilisateur non trouvé',
        user_list_retrieved: 'Liste des utilisateurs récupérée',

        // Authentification - Customers
        customer_created: 'Client enregistré avec succès',
        customer_login_success: 'Connexion réussie',
        customer_login_failed: 'Email/Téléphone ou mot de passe invalide',
        customer_updated: 'Client mis à jour',
        customer_deleted: 'Client supprimé',
        customer_restored: 'Client restauré',
        customer_not_found: 'Client non trouvé',
        customer_list_retrieved: 'Liste des clients récupérée',
        customer_found: 'Client trouvé',
        customer_fetch_error: 'Erreur lors de la recherche du client',
        wallet_balance_retrieved: 'Solde récupéré',
        wallet_balance_fetch_error: 'Erreur lors de la récupération du solde',

        // Validation
        required_fields: 'Champs requis manquants',
        invalid_email: "Format d'email invalide",
        email_or_phone_required: 'Email ou numéro de téléphone requis',
        password_required: 'Mot de passe requis',
        email_phone_password_required: 'Email/Téléphone et mot de passe requis',
        first_name_required: 'Prénom requis',
        last_name_required: 'Nom requis',
        email_required: 'Email requis',
        phone_required: 'Numéro de téléphone requis',
        name_email_phone_password_required: 'Prénom, nom, email, téléphone et mot de passe sont requis',

        // Customer spécifique
        loyalty_points_updated: 'Points de fidélité mis à jour',
        email_verified: 'Email vérifié avec succès',
        phone_verified: 'Téléphone vérifié avec succès',
        statistics_retrieved: 'Statistiques récupérées',
        customers_bulk_created: 'clients créés avec succès',
        each_customer_required_fields: 'Chaque client doit avoir prénom, nom, email, téléphone et mot de passe',
        invalid_email_for: "Format d'email invalide pour",
        customer_list_required: 'La liste des clients est requise',
        id_and_points_required: 'ID et points requis',
        search_results: 'résultats de recherche trouvés',

        // Booking & Trip
        booking_created: 'Réservation créée avec succès',
        bookings_created: 'Réservations créées avec succès',
        booking_not_found: 'Réservation non trouvée',
        trip_not_found: 'Voyage non trouvé',
        seat_not_available: 'Siège non disponible',
        seat_already_booked: 'Siège {{seat}} déjà réservé',
        this_seat_already_booked: 'Ce siège est déjà réservé pour ce voyage',
        insufficient_wallet_balance: 'Solde insuffisant. Solde actuel: {{current}} XAF, Requis: {{required}} XAF',
        wallet_deduction_error: 'Erreur lors de la déduction du solde',
        bookings_created_wallet_error: 'Réservations créées mais erreur lors de la déduction du solde',
        booking_error: 'Erreur lors de la réservation',
        trip_id_required: 'trip_id est requis',
        seat_id_required: 'seat_id est requis',
        trip_seat_id_required: 'trip_id et seat_id sont requis',
        booking_ids_required: 'booking_ids (array) est requis',
        cancellation_reason_required: 'cancellation_reason est requis',
        bookings_array_required: 'bookings (array) est requis',
        date_range_required: 'start_date et end_date ou date sont requis',
        unauthorized: 'Non autorisé',
        cannot_cancel_booking: 'Cette réservation ne peut pas être annulée',
        booking_own_account_only: 'Vous ne pouvez réserver que pour votre propre compte',
        booking_create_fields_required: 'generated_trip_id, customer_id et generated_trip_seat_id sont requis',
        orange_money_booking_fields_required: 'generated_trip_id, generated_trip_seat_id, total_price et subscriber_msisdn sont requis',
        orange_money_number_required: 'Le numéro Orange Money du client est requis (aucun numéro enregistré sur son profil)',
        mtn_momo_unavailable: "MTN Mobile Money n'est pas encore disponible. Choisissez Orange Money, le portefeuille Adigo, ou le paiement en espèces.",
        booking_updated: 'Réservation mise à jour avec succès',
        bookings_cancelled: 'Réservations annulées avec succès',
        booking_deleted: 'Réservation supprimée avec succès',
        booking_permanently_deleted: 'Réservation supprimée définitivement',
        booking_restored: 'Réservation restaurée avec succès',
        booking_or_already_active: 'Réservation non trouvée ou déjà active',
        booking_or_already_deleted: 'Réservation non trouvée ou déjà supprimée',
        bookings_fetch_error: 'Erreur lors de la récupération des réservations',
        booking_update_error: 'Erreur lors de la mise à jour de la réservation',
        booking_delete_error: 'Erreur lors de la suppression de la réservation',
        booking_restore_error: 'Erreur lors de la restauration de la réservation',
        booking_cancel_error: "Erreur lors de l'annulation des réservations",
        seat_availability_checked: 'Disponibilité vérifiée',
        seat_availability_check_error: 'Erreur lors de la vérification de disponibilité',
        booked_seats_retrieved: 'Sièges réservés récupérés',
        search_completed: 'Recherche effectuée',
        cleanup_done: 'Nettoyage effectué',
        cleanup_error: 'Erreur lors du nettoyage',
        bookings_list_retrieved: 'Liste des réservations récupérée',
        bookings_with_details_retrieved: 'Liste des réservations avec détails récupérée',
        bookings_group_retrieved: 'Liste des réservations du groupe récupérée',
        booking_found: 'Réservation trouvée',
        recent_bookings_retrieved: 'Réservations récentes récupérées',
        booking_pending_orange_money_confirmation: 'Réservation en attente — confirmez le paiement sur votre téléphone',
        cannot_modify_booking: 'Cette réservation ne peut pas être modifiée',
        booking_modified: 'Réservation modifiée avec succès',
        too_close_to_departure: 'Modification impossible : le départ est dans moins de 2 heures',
        seat_not_found: 'Siège non trouvé',

        // Notifications push (module booking)
        push_booking_confirmed_title: 'Réservation confirmée',
        push_booking_confirmed_body: 'Votre réservation {{reference}} pour {{departure}} → {{arrival}} est confirmée.',
        push_booking_cancelled_title: 'Réservation annulée',
        push_booking_cancelled_body: 'Votre réservation {{reference}} pour {{departure}} → {{arrival}} a été annulée.',
        push_refund_credited_title: 'Remboursement crédité',
        push_refund_credited_body: '{{amount}} FCFA ont été crédités sur votre portefeuille Adigo. Nouveau solde : {{balance}} FCFA.',
        push_trip_reminder_title: 'Votre voyage approche',
        push_trip_reminder_body: 'Votre voyage {{departure}} → {{arrival}} part dans {{minutes}} min (à {{time}}). Siège {{seat}}.',

        // Statuts
        status_active: 'actif',
        status_suspended: 'suspendu',
        status_pending: 'en attente',

        // Tiers
        tier_regular: 'standard',
        tier_silver: 'argent',
        tier_gold: 'or',
    }
};

/**
 * Classe utilitaire pour gérer les traductions
 */
export class I18n {
    private static defaultLanguage: Language = 'en';

    /**
     * Obtenir une traduction
     * @param key Clé de traduction
     * @param lang Langue (par défaut: 'en')
     * @param params Paramètres de remplacement pour les templates
     */
    static t(key: string, lang: Language = 'en', params?: Record<string, string | number>): string {
        const language = lang || this.defaultLanguage;
        const keys = key.split('.');

        let translation: any = translations[language];

        for (const k of keys) {
            if (translation && typeof translation === 'object' && k in translation) {
                translation = translation[k];
            } else {
                // Fallback to English if translation not found
                translation = this.getTranslationInEnglish(key);
                break;
            }
        }

        let result = typeof translation === 'string' ? translation : key;

        // Replace parameters if provided
        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                result = result.replace(`{{${paramKey}}}`, String(paramValue));
            }
        }

        return result;
    }

    /**
     * Obtenir la traduction en anglais (fallback)
     */
    private static getTranslationInEnglish(key: string): string {
        const keys = key.split('.');
        let translation: any = translations['en'];

        for (const k of keys) {
            if (translation && typeof translation === 'object' && k in translation) {
                translation = translation[k];
            } else {
                return key;
            }
        }

        return typeof translation === 'string' ? translation : key;
    }

    /**
     * Détecter la langue à partir de la requête
     * Recherche dans:
     * 1. req.body.lang
     * 2. req.query.lang
     * 3. req.headers['accept-language']
     * 4. Par défaut: 'en'
     */
    static detectLanguage(req: any): Language {
        // 1. Check body
        if (req.body?.lang && this.isValidLanguage(req.body.lang)) {
            return req.body.lang;
        }

        // 2. Check query
        if (req.query?.lang && this.isValidLanguage(req.query.lang)) {
            return req.query.lang;
        }

        // 3. Check headers
        const acceptLanguage = req.headers?.['accept-language'];
        if (acceptLanguage) {
            const primaryLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
            if (this.isValidLanguage(primaryLang)) {
                return primaryLang;
            }
        }

        // 4. Default
        return this.defaultLanguage;
    }

    /**
     * Vérifier si une langue est valide
     */
    private static isValidLanguage(lang: any): lang is Language {
        return lang === 'en' || lang === 'fr';
    }

    /**
     * Ajouter des traductions dynamiquement
     */
    static addTranslations(lang: Language, newTranslations: Translations): void {
        translations[lang] = {
            ...translations[lang],
            ...newTranslations
        };
    }

    /**
     * Obtenir toutes les langues supportées
     */
    static getSupportedLanguages(): Language[] {
        return ['en', 'fr'];
    }

    /**
     * Définir la langue par défaut
     */
    static setDefaultLanguage(lang: Language): void {
        this.defaultLanguage = lang;
    }
}

// Export des fonctions utilitaires
export const t = I18n.t.bind(I18n);
export const detectLanguage = I18n.detectLanguage.bind(I18n);
