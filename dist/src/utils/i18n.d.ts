/**
 * Système de traduction i18n (internationalisation)
 * Support: Anglais (par défaut) et Français
 */
export type Language = 'en' | 'fr';
export interface Translations {
    [key: string]: string | Translations;
}
/**
 * Classe utilitaire pour gérer les traductions
 */
export declare class I18n {
    private static defaultLanguage;
    /**
     * Obtenir une traduction
     * @param key Clé de traduction
     * @param lang Langue (par défaut: 'en')
     * @param params Paramètres de remplacement pour les templates
     */
    static t(key: string, lang?: Language, params?: Record<string, string | number>): string;
    /**
     * Obtenir la traduction en anglais (fallback)
     */
    private static getTranslationInEnglish;
    /**
     * Détecter la langue à partir de la requête
     * Recherche dans:
     * 1. req.body.lang
     * 2. req.query.lang
     * 3. req.headers['accept-language']
     * 4. Par défaut: 'en'
     */
    static detectLanguage(req: any): Language;
    /**
     * Vérifier si une langue est valide
     */
    private static isValidLanguage;
    /**
     * Ajouter des traductions dynamiquement
     */
    static addTranslations(lang: Language, newTranslations: Translations): void;
    /**
     * Obtenir toutes les langues supportées
     */
    static getSupportedLanguages(): Language[];
    /**
     * Définir la langue par défaut
     */
    static setDefaultLanguage(lang: Language): void;
}
export declare const t: any;
export declare const detectLanguage: any;
