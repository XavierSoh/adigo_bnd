import { AIProcessingResult, Message } from "../models/chat.model";
/**
 * Service d'IA pour analyser les messages et proposer des réponses automatiques
 */
export declare class ChatAIService {
    /**
     * Mots-clés pour détecter les intentions (français + anglais)
     */
    private static intentKeywords;
    /**
     * Analyser un message et déterminer l'intention
     */
    static analyzeMessage(message: Message): Promise<AIProcessingResult>;
    /**
     * Détecter l'intention d'un message
     */
    private static detectIntent;
    /**
     * Calculer le score de confiance pour une intention
     */
    private static calculateConfidence;
    /**
     * Interpoler un template avec les données du message
     */
    private static interpolateTemplate;
    /**
     * Récupérer les quick replies appropriés pour une intention
     */
    private static getQuickRepliesForIntent;
    /**
     * Générer une proposition de réservation basée sur le message
     */
    private static generateBookingProposal;
    /**
     * Extraire les destinations d'un message
     */
    private static extractDestinations;
    /**
     * Capitaliser la première lettre
     */
    private static capitalize;
    /**
     * Détecter la langue d'un message (français ou anglais)
     * Par défaut: anglais
     */
    private static detectLanguage;
    /**
     * Traiter un message entrant avec l'IA
     */
    static processIncomingMessage(message: Message): Promise<void>;
    /**
     * Obtenir une réponse IA pour un message spécifique
     */
    static getAIResponse(messageId: number): Promise<AIProcessingResult | null>;
}
