import { Request, Response } from 'express';
export declare class ChatController {
    /**
     * Créer une nouvelle conversation
     * POST /v1/api/chat/conversations
     */
    static createConversation(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer une conversation par ID
     * GET /v1/api/chat/conversations/:id
     */
    static getConversationById(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer une conversation avec ses messages
     * GET /v1/api/chat/conversations/:id/messages
     */
    static getConversationWithMessages(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les conversations d'un client
     * GET /v1/api/chat/conversations/customer/:customerId
     */
    static getConversationsByCustomer(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les conversations assignées à un admin
     * GET /v1/api/chat/conversations/admin/:adminId
     */
    static getConversationsByAdmin(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les conversations ouvertes (non assignées)
     * GET /v1/api/chat/conversations/open
     */
    static getOpenConversations(req: Request, res: Response): Promise<void>;
    /**
     * Mettre à jour une conversation
     * PUT /v1/api/chat/conversations/:id
     */
    static updateConversation(req: Request, res: Response): Promise<void>;
    /**
     * Assigner une conversation à un admin
     * POST /v1/api/chat/conversations/:id/assign
     */
    static assignConversation(req: Request, res: Response): Promise<void>;
    /**
     * Supprimer une conversation
     * DELETE /v1/api/chat/conversations/:id
     */
    static deleteConversation(req: Request, res: Response): Promise<void>;
    /**
     * Créer un nouveau message
     * POST /v1/api/chat/messages
     */
    static createMessage(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les messages d'une conversation
     * GET /v1/api/chat/conversations/:id/messages/list
     */
    static getMessagesByConversation(req: Request, res: Response): Promise<void>;
    /**
     * Marquer un message comme lu
     * PATCH /v1/api/chat/messages/:id/read
     */
    static markMessageAsRead(req: Request, res: Response): Promise<void>;
    /**
     * Marquer tous les messages d'une conversation comme lus
     * PATCH /v1/api/chat/conversations/:id/read
     */
    static markConversationAsRead(req: Request, res: Response): Promise<void>;
    /**
     * Supprimer un message
     * DELETE /v1/api/chat/messages/:id
     */
    static deleteMessage(req: Request, res: Response): Promise<void>;
    /**
     * Obtenir une suggestion IA pour un message
     * GET /v1/api/chat/messages/:id/ai-suggestion
     */
    static getAISuggestion(req: Request, res: Response): Promise<void>;
    /**
     * Créer un quick reply
     * POST /v1/api/chat/quick-replies
     */
    static createQuickReply(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les quick replies actifs
     * GET /v1/api/chat/quick-replies
     */
    static getQuickReplies(req: Request, res: Response): Promise<void>;
    /**
     * Créer une réponse IA
     * POST /v1/api/chat/ai-responses
     */
    static createAIResponse(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les réponses IA actives
     * GET /v1/api/chat/ai-responses
     */
    static getAIResponses(req: Request, res: Response): Promise<void>;
    /**
     * Upload file or image for chat
     * POST /v1/api/chat/upload
     */
    static uploadChatFile(req: Request, res: Response): Promise<void>;
    /**
     * Récupérer les statistiques du chat
     * GET /v1/api/chat/statistics
     */
    static getChatStatistics(req: Request, res: Response): Promise<void>;
    /**
     * Get online customers
     * GET /v1/api/chat/presence/online
     */
    static getOnlineCustomers(req: Request, res: Response): Promise<void>;
    /**
     * Get online status for specific customers
     * POST /v1/api/chat/presence/status
     */
    static getCustomersStatus(req: Request, res: Response): Promise<void>;
    /**
     * Send push notification when admin sends message to customer
     * Private method called internally
     */
    private static sendPushNotificationForMessage;
}
