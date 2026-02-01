import { Conversation, Message, QuickReply, AIResponse, CreateConversationDTO, UpdateConversationDTO, CreateMessageDTO, CreateQuickReplyDTO, CreateAIResponseDTO, ConversationWithMessages, ConversationStatus, AIIntent } from "../models/chat.model";
export declare class ChatRepository {
    /**
     * Créer une nouvelle conversation
     */
    static createConversation(data: CreateConversationDTO): Promise<Conversation>;
    /**
     * Récupérer une conversation par ID
     */
    static getConversationById(id: number): Promise<Conversation | null>;
    /**
     * Récupérer toutes les conversations d'un client
     */
    static getConversationsByCustomer(customerId: number, status?: ConversationStatus): Promise<Conversation[]>;
    /**
     * Récupérer toutes les conversations assignées à un admin
     */
    static getConversationsByAdmin(adminId: number, status?: ConversationStatus): Promise<Conversation[]>;
    /**
     * Récupérer toutes les conversations ouvertes (non assignées)
     */
    static getOpenConversations(): Promise<Conversation[]>;
    /**
     * Mettre à jour une conversation
     */
    static updateConversation(id: number, data: UpdateConversationDTO): Promise<Conversation | null>;
    /**
     * Assigner une conversation à un admin
     */
    static assignConversation(conversationId: number, adminId: number): Promise<boolean>;
    /**
     * Supprimer une conversation (soft delete)
     */
    static deleteConversation(id: number, deletedBy: number): Promise<boolean>;
    /**
     * Créer un nouveau message
     */
    static createMessage(data: CreateMessageDTO): Promise<Message>;
    /**
     * Récupérer tous les messages d'une conversation
     */
    static getMessagesByConversation(conversationId: number, limit?: number, offset?: number): Promise<Message[]>;
    /**
     * Récupérer une conversation avec ses messages
     */
    static getConversationWithMessages(conversationId: number): Promise<ConversationWithMessages | null>;
    /**
     * Marquer un message comme lu
     */
    static markMessageAsRead(messageId: number): Promise<boolean>;
    /**
     * Marquer tous les messages d'une conversation comme lus
     */
    static markConversationAsRead(conversationId: number, forUser: 'customer' | 'admin'): Promise<number>;
    /**
     * Supprimer un message (soft delete)
     */
    static deleteMessage(id: number): Promise<boolean>;
    /**
     * Mettre à jour les données IA d'un message
     */
    static updateMessageAI(messageId: number, aiData: {
        ai_processed?: boolean;
        ai_suggested_response?: string;
        ai_confidence?: number;
        ai_intent?: AIIntent;
    }): Promise<boolean>;
    /**
     * Créer un quick reply
     */
    static createQuickReply(data: CreateQuickReplyDTO): Promise<QuickReply>;
    /**
     * Récupérer tous les quick replies actifs
     */
    static getActiveQuickReplies(userRole?: 'customer' | 'admin'): Promise<QuickReply[]>;
    /**
     * Récupérer un quick reply par ID
     */
    static getQuickReplyById(id: number): Promise<QuickReply | null>;
    /**
     * Récupérer plusieurs quick replies par IDs
     */
    static getQuickRepliesByIds(ids: number[]): Promise<QuickReply[]>;
    /**
     * Créer une réponse IA
     */
    static createAIResponse(data: CreateAIResponseDTO): Promise<AIResponse>;
    /**
     * Récupérer toutes les réponses IA actives
     */
    static getActiveAIResponses(): Promise<AIResponse[]>;
    /**
     * Récupérer les réponses IA par intent
     */
    static getAIResponsesByIntent(intent: AIIntent): Promise<AIResponse[]>;
    /**
     * Incrémenter le compteur d'utilisation d'une réponse IA
     */
    static incrementAIResponseUsage(id: number): Promise<boolean>;
    /**
     * Récupérer les statistiques générales du chat
     */
    static getChatStatistics(): Promise<any>;
}
