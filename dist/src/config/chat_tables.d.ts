/**
 * Tables pour le système de messagerie en temps réel
 *
 * Structure:
 * - conversations: Contient les conversations entre clients et admins
 * - messages: Contient tous les messages échangés
 * - quick_replies: Boutons d'action rapide
 * - ai_responses: Réponses automatiques de l'IA
 */
export declare const kConversations = "conversations";
export declare const kMessages = "messages";
export declare const kQuickReplies = "quick_replies";
export declare const kAIResponses = "ai_responses";
/**
 * Créer la base de données si elle n'existe pas
 * Note: Cette fonction nécessite une connexion à la base 'postgres'
 */
export declare function createChatDatabaseIfNotExists(dbName: string): Promise<void>;
export declare const chatTables: {
    query: string;
}[];
/**
 * Initialise les tables du chat
 */
export default function createChatTables(): Promise<void>;
