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
