import { Request, Response } from 'express';
import { ChatRepository } from '../repository/chat.repository';
import { ChatAIService } from '../services/chatAI.service';
import { SocketService } from '../services/socket.service';
import { NotificationService, ChatNotificationData } from '../services/notification.service';
import { CustomerRepository } from '../repository/customer.repository';
import { Customer } from '../models/customer.model';
import {
    CreateConversationDTO,
    UpdateConversationDTO,
    CreateMessageDTO,
    CreateQuickReplyDTO,
    CreateAIResponseDTO,
    Message,
} from '../models/chat.model';

export class ChatController {
    // ============================================
    // CONVERSATIONS
    // ============================================

    /**
     * Créer une nouvelle conversation
     * POST /v1/api/chat/conversations
     */
    static async createConversation(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateConversationDTO = req.body;

            if (!data.customer_id) {
                res.status(400).json({
                    status: false,
                    message: 'customer_id est requis',
                    code: 400,
                });
                return;
            }

            const conversation = await ChatRepository.createConversation(data);

            res.status(201).json({
                status: true,
                message: 'Conversation créée avec succès',
                body: conversation,
            });
        } catch (error) {
            console.error('Error creating conversation:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la création de la conversation',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer une conversation par ID
     * GET /v1/api/chat/conversations/:id
     */
    static async getConversationById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            const conversation = await ChatRepository.getConversationById(id);

            if (!conversation) {
                res.status(404).json({
                    status: false,
                    message: 'Conversation non trouvée',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Conversation récupérée',
                body: conversation,
            });
        } catch (error) {
            console.error('Error getting conversation:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer une conversation avec ses messages
     * GET /v1/api/chat/conversations/:id/messages
     */
    static async getConversationWithMessages(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            const conversation = await ChatRepository.getConversationWithMessages(id);

            if (!conversation) {
                res.status(404).json({
                    status: false,
                    message: 'Conversation non trouvée',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Conversation récupérée',
                body: conversation,
            });
        } catch (error) {
            console.error('Error getting conversation with messages:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer les conversations d'un client
     * GET /v1/api/chat/conversations/customer/:customerId
     */
    static async getConversationsByCustomer(req: Request, res: Response): Promise<void> {
        try {
            const customerId = parseInt(req.params.customerId);
            const status = req.query.status as any;

            const conversations = await ChatRepository.getConversationsByCustomer(
                customerId,
                status
            );

            res.status(200).json({
                status: true,
                message: `${conversations.length} conversation(s) récupérée(s)`,
                body: conversations,
            });
        } catch (error) {
            console.error('Error getting conversations by customer:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer les conversations assignées à un admin
     * GET /v1/api/chat/conversations/admin/:adminId
     */
    static async getConversationsByAdmin(req: Request, res: Response): Promise<void> {
        try {
            const adminId = parseInt(req.params.adminId);
            const status = req.query.status as any;

            const conversations = await ChatRepository.getConversationsByAdmin(
                adminId,
                status
            );

            res.status(200).json({
                status: true,
                message: `${conversations.length} conversation(s) récupérée(s)`,
                body: conversations,
            });
        } catch (error) {
            console.error('Error getting conversations by admin:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer les conversations ouvertes (non assignées)
     * GET /v1/api/chat/conversations/open
     */
    static async getOpenConversations(req: Request, res: Response): Promise<void> {
        try {
            const conversations = await ChatRepository.getOpenConversations();

            res.status(200).json({
                status: true,
                message: `${conversations.length} conversation(s) ouverte(s)`,
                body: conversations,
            });
        } catch (error) {
            console.error('Error getting open conversations:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Mettre à jour une conversation
     * PUT /v1/api/chat/conversations/:id
     */
    static async updateConversation(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const data: UpdateConversationDTO = req.body;

            const conversation = await ChatRepository.updateConversation(id, data);

            if (!conversation) {
                res.status(404).json({
                    status: false,
                    message: 'Conversation non trouvée',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Conversation mise à jour',
                body: conversation,
            });
        } catch (error) {
            console.error('Error updating conversation:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la mise à jour',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Assigner une conversation à un admin
     * POST /v1/api/chat/conversations/:id/assign
     */
    static async assignConversation(req: Request, res: Response): Promise<void> {
        try {
            const conversationId = parseInt(req.params.id);
            const { admin_id } = req.body;

            if (!admin_id) {
                res.status(400).json({
                    status: false,
                    message: 'admin_id est requis',
                    code: 400,
                });
                return;
            }

            const success = await ChatRepository.assignConversation(
                conversationId,
                admin_id
            );

            if (!success) {
                res.status(404).json({
                    status: false,
                    message: 'Conversation non trouvée',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Conversation assignée avec succès',
            });
        } catch (error) {
            console.error('Error assigning conversation:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de l\'assignation',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Supprimer une conversation
     * DELETE /v1/api/chat/conversations/:id
     */
    static async deleteConversation(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const { deleted_by } = req.body;

            const success = await ChatRepository.deleteConversation(id, deleted_by || 1);

            if (!success) {
                res.status(404).json({
                    status: false,
                    message: 'Conversation non trouvée',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Conversation supprimée',
            });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la suppression',
                error: error,
                code: 500,
            });
        }
    }

    // ============================================
    // MESSAGES
    // ============================================

    /**
     * Créer un nouveau message
     * POST /v1/api/chat/messages
     */
    static async createMessage(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateMessageDTO = req.body;

            if (!data.conversation_id || !data.sender_type || !data.content) {
                res.status(400).json({
                    status: false,
                    message: 'Champs requis manquants',
                    code: 400,
                });
                return;
            }

            const message = await ChatRepository.createMessage(data);

            // Traiter le message avec l'IA si c'est un message client
            if (data.sender_type === 'customer') {
                // Traitement asynchrone de l'IA (ne bloque pas la réponse)
                ChatAIService.processIncomingMessage(message).catch((error) =>
                    console.error('Error processing message with AI:', error)
                );
            }

            // ✅ SEND PUSH NOTIFICATION if admin is sending to customer
            if (data.sender_type === 'admin') {
                // Send push notification asynchronously (don't block response)
                ChatController.sendPushNotificationForMessage(data.conversation_id, message).catch((error) =>
                    console.error('Error sending push notification:', error)
                );
            }

            // ✅ EMIT SOCKET.IO EVENT - Broadcast to all clients in the conversation room
            console.log(`📤 [ChatController] Broadcasting message to conversation_${data.conversation_id}`);
            SocketService.sendMessageToConversation(data.conversation_id, message);

            res.status(201).json({
                status: true,
                message: 'Message créé avec succès',
                body: message,
            });
        } catch (error) {
            console.error('Error creating message:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la création du message',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer les messages d'une conversation
     * GET /v1/api/chat/conversations/:id/messages/list
     */
    static async getMessagesByConversation(req: Request, res: Response): Promise<void> {
        try {
            const conversationId = parseInt(req.params.id);
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

            const messages = await ChatRepository.getMessagesByConversation(
                conversationId,
                limit,
                offset
            );

            res.status(200).json({
                status: true,
                message: `${messages.length} message(s) récupéré(s)`,
                body: messages,
            });
        } catch (error) {
            console.error('Error getting messages:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Marquer un message comme lu
     * PATCH /v1/api/chat/messages/:id/read
     */
    static async markMessageAsRead(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.id);

            const success = await ChatRepository.markMessageAsRead(messageId);

            if (!success) {
                res.status(404).json({
                    status: false,
                    message: 'Message non trouvé ou déjà lu',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Message marqué comme lu',
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la mise à jour',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Marquer tous les messages d'une conversation comme lus
     * PATCH /v1/api/chat/conversations/:id/read
     */
    static async markConversationAsRead(req: Request, res: Response): Promise<void> {
        try {
            const conversationId = parseInt(req.params.id);
            const { for_user } = req.body; // 'customer' ou 'admin'

            if (!for_user || !['customer', 'admin'].includes(for_user)) {
                res.status(400).json({
                    status: false,
                    message: 'for_user doit être "customer" ou "admin"',
                    code: 400,
                });
                return;
            }

            const count = await ChatRepository.markConversationAsRead(
                conversationId,
                for_user
            );

            res.status(200).json({
                status: true,
                message: `${count} message(s) marqué(s) comme lu(s)`,
            });
        } catch (error) {
            console.error('Error marking conversation as read:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la mise à jour',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Supprimer un message
     * DELETE /v1/api/chat/messages/:id
     */
    static async deleteMessage(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            const success = await ChatRepository.deleteMessage(id);

            if (!success) {
                res.status(404).json({
                    status: false,
                    message: 'Message non trouvé',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Message supprimé',
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la suppression',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Obtenir une suggestion IA pour un message
     * GET /v1/api/chat/messages/:id/ai-suggestion
     */
    static async getAISuggestion(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.id);

            const aiResult = await ChatAIService.getAIResponse(messageId);

            if (!aiResult) {
                res.status(404).json({
                    status: false,
                    message: 'Message non trouvé',
                    code: 404,
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: 'Suggestion IA récupérée',
                body: aiResult,
            });
        } catch (error) {
            console.error('Error getting AI suggestion:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    // ============================================
    // QUICK REPLIES
    // ============================================

    /**
     * Créer un quick reply
     * POST /v1/api/chat/quick-replies
     */
    static async createQuickReply(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateQuickReplyDTO = req.body;

            if (!data.title || !data.action_type || !data.payload) {
                res.status(400).json({
                    status: false,
                    message: 'Champs requis manquants',
                    code: 400,
                });
                return;
            }

            const quickReply = await ChatRepository.createQuickReply(data);

            res.status(201).json({
                status: true,
                message: 'Quick reply créé avec succès',
                body: quickReply,
            });
        } catch (error) {
            console.error('Error creating quick reply:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la création',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer les quick replies actifs
     * GET /v1/api/chat/quick-replies
     */
    static async getQuickReplies(req: Request, res: Response): Promise<void> {
        try {
            const userRole = req.query.user_role as 'customer' | 'admin' | undefined;

            const quickReplies = await ChatRepository.getActiveQuickReplies(userRole);

            res.status(200).json({
                status: true,
                message: `${quickReplies.length} quick reply(s) récupéré(s)`,
                body: quickReplies,
            });
        } catch (error) {
            console.error('Error getting quick replies:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    // ============================================
    // AI RESPONSES
    // ============================================

    /**
     * Créer une réponse IA
     * POST /v1/api/chat/ai-responses
     */
    static async createAIResponse(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateAIResponseDTO = req.body;

            if (!data.intent || !data.keywords || !data.response_template) {
                res.status(400).json({
                    status: false,
                    message: 'Champs requis manquants',
                    code: 400,
                });
                return;
            }

            const aiResponse = await ChatRepository.createAIResponse(data);

            res.status(201).json({
                status: true,
                message: 'Réponse IA créée avec succès',
                body: aiResponse,
            });
        } catch (error) {
            console.error('Error creating AI response:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la création',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Récupérer les réponses IA actives
     * GET /v1/api/chat/ai-responses
     */
    static async getAIResponses(req: Request, res: Response): Promise<void> {
        try {
            const aiResponses = await ChatRepository.getActiveAIResponses();

            res.status(200).json({
                status: true,
                message: `${aiResponses.length} réponse(s) IA récupérée(s)`,
                body: aiResponses,
            });
        } catch (error) {
            console.error('Error getting AI responses:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    // ============================================
    // FILE UPLOAD
    // ============================================

    /**
     * Upload file or image for chat
     * POST /v1/api/chat/upload
     */
    static async uploadChatFile(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    status: false,
                    message: 'Aucun fichier fourni',
                    code: 400,
                });
                return;
            }

            const file = req.file;
            const fileUrl = `/uploads/chat/${file.destination.includes('images') ? 'images' : 'files'}/${file.filename}`;

            // Determine file type - check both MIME type AND file extension as fallback
            const imageExtensions = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i;
            const isMimeImage = file.mimetype.startsWith('image/');
            const isExtImage = imageExtensions.test(file.originalname);
            const isImage = isMimeImage || isExtImage;
            const fileType = isImage ? 'image' : 'file';

            console.log(`📤 [ChatController] File uploaded successfully`);
            console.log(`📤 [ChatController] Original name: ${file.originalname}`);
            console.log(`📤 [ChatController] File URL: ${fileUrl}`);
            console.log(`📤 [ChatController] File type: ${fileType}`);
            console.log(`📤 [ChatController] MIME type: ${file.mimetype}`);

            res.status(200).json({
                status: true,
                message: 'Fichier uploadé avec succès',
                body: {
                    file_url: fileUrl,
                    file_name: file.originalname,
                    file_size: file.size,
                    file_type: fileType,
                    mime_type: file.mimetype,
                },
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de l\'upload du fichier',
                error: error,
                code: 500,
            });
        }
    }

    // ============================================
    // STATISTIQUES
    // ============================================

    /**
     * Récupérer les statistiques du chat
     * GET /v1/api/chat/statistics
     */
    static async getChatStatistics(req: Request, res: Response): Promise<void> {
        try {
            const statistics = await ChatRepository.getChatStatistics();

            res.status(200).json({
                status: true,
                message: 'Statistiques récupérées',
                body: statistics,
            });
        } catch (error) {
            console.error('Error getting statistics:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Get online customers
     * GET /v1/api/chat/presence/online
     */
    static async getOnlineCustomers(req: Request, res: Response): Promise<void> {
        try {
            const onlineCustomers = SocketService.getOnlineCustomers();

            res.status(200).json({
                status: true,
                message: 'Liste des clients en ligne récupérée',
                body: {
                    online_customers: onlineCustomers,
                    count: onlineCustomers.length,
                },
            });
        } catch (error) {
            console.error('Error getting online customers:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    /**
     * Get online status for specific customers
     * POST /v1/api/chat/presence/status
     */
    static async getCustomersStatus(req: Request, res: Response): Promise<void> {
        try {
            const { customer_ids } = req.body;

            if (!customer_ids || !Array.isArray(customer_ids)) {
                res.status(400).json({
                    status: false,
                    message: 'customer_ids (array) est requis',
                    code: 400,
                });
                return;
            }

            const statusMap = SocketService.getCustomersOnlineStatus(customer_ids);

            // Convert Map to object for JSON response
            const statusObject: { [key: number]: boolean } = {};
            statusMap.forEach((isOnline, customerId) => {
                statusObject[customerId] = isOnline;
            });

            res.status(200).json({
                status: true,
                message: 'Statuts récupérés',
                body: statusObject,
            });
        } catch (error) {
            console.error('Error getting customers status:', error);
            res.status(500).json({
                status: false,
                message: 'Erreur lors de la récupération',
                error: error,
                code: 500,
            });
        }
    }

    // ============================================
    // PUSH NOTIFICATIONS
    // ============================================

    /**
     * Send push notification when admin sends message to customer
     * Private method called internally
     */
    private static async sendPushNotificationForMessage(
        conversationId: number,
        message: Message
    ): Promise<void> {
        try {
            console.log(`📲 [ChatController] Sending push notification for conversation ${conversationId}`);

            // Get conversation to retrieve customer_id
            const conversation = await ChatRepository.getConversationById(conversationId);
            if (!conversation) {
                console.log(`⚠️ [ChatController] Conversation ${conversationId} not found`);
                return;
            }

            // Get customer to retrieve FCM token
            const customerResponse = await CustomerRepository.findById(conversation.customer_id);
            if (!customerResponse.status || !customerResponse.body) {
                console.log(`⚠️ [ChatController] Customer ${conversation.customer_id} not found`);
                return;
            }

            const customer = customerResponse.body as Customer;

            // Check if customer has FCM token
            if (!customer.fcm_token) {
                console.log(`⚠️ [ChatController] Customer ${customer.id} has no FCM token`);
                return;
            }

            // Prepare notification data
            const notificationData: ChatNotificationData = {
                conversation_id: conversationId,
                message_id: message.id,
                sender_name: message.sender_name || 'Adigo Support',
                message_preview: message.content.substring(0, 100), // Limit to 100 chars
                type: 'new_message',
            };

            // Send push notification
            const success = await NotificationService.sendChatMessageNotification(
                customer.fcm_token,
                notificationData
            );

            if (success) {
                console.log(`✅ [ChatController] Push notification sent to customer ${customer.id}`);
            } else {
                console.log(`❌ [ChatController] Failed to send push notification to customer ${customer.id}`);
            }
        } catch (error) {
            console.error('[ChatController] Error sending push notification:', error);
            // Don't throw - notifications are not critical
        }
    }
}
