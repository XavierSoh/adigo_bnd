import pgpDb from "../config/pgdb";
import {
    kConversations,
    kMessages,
    kQuickReplies,
    kAIResponses,
} from "../config/chat_tables";
import {
    Conversation,
    Message,
    QuickReply,
    AIResponse,
    CreateConversationDTO,
    UpdateConversationDTO,
    CreateMessageDTO,
    CreateQuickReplyDTO,
    CreateAIResponseDTO,
    ConversationWithMessages,
    ConversationStatus,
    AIIntent,
} from "../models/chat.model";

export class ChatRepository {
    // ============================================
    // CONVERSATIONS
    // ============================================

    /**
     * Créer une nouvelle conversation
     */
    static async createConversation(data: CreateConversationDTO): Promise<Conversation> {
        const { customer_id, subject, tags, initial_message } = data;

        const conversation = await pgpDb.one<Conversation>(
            `INSERT INTO ${kConversations} (
                customer_id, subject, tags, status
            ) VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [customer_id, subject || null, tags || null, 'open']
        );

        // Si un message initial est fourni, le créer
        if (initial_message) {
            await this.createMessage({
                conversation_id: conversation.id,
                sender_type: 'customer',
                sender_id: customer_id,
                message_type: 'text',
                content: initial_message,
            });
        }

        return conversation;
    }

    /**
     * Récupérer une conversation par ID
     */
    static async getConversationById(id: number): Promise<Conversation | null> {
        try {
            const conversation = await pgpDb.one<Conversation>(
                `SELECT c.*,
                    CONCAT(cust.first_name, ' ', cust.last_name) as customer_name,
                    u.login as admin_name,
                    COUNT(m.id) as message_count
                FROM ${kConversations} c
                LEFT JOIN customer cust ON c.customer_id = cust.id
                LEFT JOIN "users" u ON c.assigned_to = u.id
                LEFT JOIN ${kMessages} m ON c.id = m.conversation_id AND m.is_deleted = FALSE
                WHERE c.id = $1 AND c.is_deleted = FALSE
                GROUP BY c.id, cust.first_name, cust.last_name, u.login`,
                [id]
            );
            return conversation;
        } catch {
            return null;
        }
    }

    /**
     * Récupérer toutes les conversations d'un client
     */
    static async getConversationsByCustomer(
        customerId: number,
        status?: ConversationStatus
    ): Promise<Conversation[]> {
        const statusFilter = status ? 'AND c.status = $2' : '';
        const params = status ? [customerId, status] : [customerId];

        return await pgpDb.manyOrNone<Conversation>(
            `SELECT c.*,
                CONCAT(cust.first_name, ' ', cust.last_name) as customer_name,
                u.login as admin_name,
                COUNT(m.id) as message_count
            FROM ${kConversations} c
            LEFT JOIN customer cust ON c.customer_id = cust.id
            LEFT JOIN "users" u ON c.assigned_to = u.id
            LEFT JOIN ${kMessages} m ON c.id = m.conversation_id AND m.is_deleted = FALSE
            WHERE c.customer_id = $1 AND c.is_deleted = FALSE ${statusFilter}
            GROUP BY c.id, cust.first_name, cust.last_name, u.login
            ORDER BY c.last_message_at DESC`,
            params
        );
    }

    /**
     * Récupérer toutes les conversations assignées à un admin
     */
    static async getConversationsByAdmin(
        adminId: number,
        status?: ConversationStatus
    ): Promise<Conversation[]> {
        const statusFilter = status ? 'AND c.status = $2' : '';
        const params = status ? [adminId, status] : [adminId];

        return await pgpDb.manyOrNone<Conversation>(
            `SELECT c.*,
                CONCAT(cust.first_name, ' ', cust.last_name) as customer_name,
                u.login as admin_name,
                COUNT(m.id) as message_count
            FROM ${kConversations} c
            LEFT JOIN customer cust ON c.customer_id = cust.id
            LEFT JOIN "users" u ON c.assigned_to = u.id
            LEFT JOIN ${kMessages} m ON c.id = m.conversation_id AND m.is_deleted = FALSE
            WHERE c.assigned_to = $1 AND c.is_deleted = FALSE ${statusFilter}
            GROUP BY c.id, cust.first_name, cust.last_name, u.login
            ORDER BY c.last_message_at DESC`,
            params
        );
    }

    /**
     * Récupérer toutes les conversations ouvertes (non assignées)
     */
    static async getOpenConversations(): Promise<Conversation[]> {
        return await pgpDb.manyOrNone<Conversation>(
            `SELECT c.*,
                CONCAT(cust.first_name, ' ', cust.last_name) as customer_name,
                COUNT(m.id) as message_count
            FROM ${kConversations} c
            LEFT JOIN customer cust ON c.customer_id = cust.id
            LEFT JOIN ${kMessages} m ON c.id = m.conversation_id AND m.is_deleted = FALSE
            WHERE c.assigned_to IS NULL
              AND c.status = 'open'
              AND c.is_deleted = FALSE
            GROUP BY c.id, cust.first_name, cust.last_name
            ORDER BY c.priority DESC, c.created_at ASC`
        );
    }

    /**
     * Mettre à jour une conversation
     */
    static async updateConversation(
        id: number,
        data: UpdateConversationDTO
    ): Promise<Conversation | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(data.status);

            // Si fermée, définir closed_at
            if (data.status === 'closed') {
                fields.push(`closed_at = CURRENT_TIMESTAMP`);
            }
        }

        if (data.priority !== undefined) {
            fields.push(`priority = $${paramIndex++}`);
            values.push(data.priority);
        }

        if (data.assigned_to !== undefined) {
            fields.push(`assigned_to = $${paramIndex++}`);
            values.push(data.assigned_to);
        }

        if (data.subject !== undefined) {
            fields.push(`subject = $${paramIndex++}`);
            values.push(data.subject);
        }

        if (data.tags !== undefined) {
            fields.push(`tags = $${paramIndex++}`);
            values.push(data.tags);
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        try {
            return await pgpDb.one<Conversation>(
                `UPDATE ${kConversations}
                SET ${fields.join(', ')}
                WHERE id = $${paramIndex} AND is_deleted = FALSE
                RETURNING *`,
                values
            );
        } catch {
            return null;
        }
    }

    /**
     * Assigner une conversation à un admin
     */
    static async assignConversation(
        conversationId: number,
        adminId: number
    ): Promise<boolean> {
        const result = await pgpDb.result(
            `UPDATE ${kConversations}
            SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND is_deleted = FALSE`,
            [adminId, conversationId]
        );
        return result.rowCount > 0;
    }

    /**
     * Supprimer une conversation (soft delete)
     */
    static async deleteConversation(id: number, deletedBy: number): Promise<boolean> {
        const result = await pgpDb.result(
            `UPDATE ${kConversations}
            SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
            WHERE id = $2`,
            [deletedBy, id]
        );
        return result.rowCount > 0;
    }

    // ============================================
    // MESSAGES
    // ============================================

    /**
     * Créer un nouveau message
     */
    static async createMessage(data: CreateMessageDTO): Promise<Message> {
        const {
            conversation_id,
            sender_type,
            sender_id,
            sender_name,
            message_type,
            content,
            metadata,
        } = data;

        const message = await pgpDb.one<Message>(
            `INSERT INTO ${kMessages} (
                conversation_id, sender_type, sender_id, sender_name,
                message_type, content, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                conversation_id,
                sender_type,
                sender_id || null,
                sender_name || null,
                message_type,
                content,
                metadata ? JSON.stringify(metadata) : null,
            ]
        );

        // Mettre à jour la conversation
        await pgpDb.none(
            `UPDATE ${kConversations}
            SET last_message_at = CURRENT_TIMESTAMP,
                last_message_preview = $1,
                updated_at = CURRENT_TIMESTAMP,
                unread_count_${sender_type === 'customer' ? 'admin' : 'customer'} =
                    unread_count_${sender_type === 'customer' ? 'admin' : 'customer'} + 1
            WHERE id = $2`,
            [content.substring(0, 100), conversation_id]
        );

        return message;
    }

    /**
     * Récupérer tous les messages d'une conversation
     */
    static async getMessagesByConversation(
        conversationId: number,
        limit?: number,
        offset?: number
    ): Promise<Message[]> {
        const limitClause = limit ? `LIMIT ${limit}` : '';
        const offsetClause = offset ? `OFFSET ${offset}` : '';

        return await pgpDb.manyOrNone<Message>(
            `SELECT * FROM ${kMessages}
            WHERE conversation_id = $1 AND is_deleted = FALSE
            ORDER BY created_at ASC
            ${limitClause} ${offsetClause}`,
            [conversationId]
        );
    }

    /**
     * Récupérer une conversation avec ses messages
     */
    static async getConversationWithMessages(
        conversationId: number
    ): Promise<ConversationWithMessages | null> {
        const conversation = await this.getConversationById(conversationId);
        if (!conversation) return null;

        const messages = await this.getMessagesByConversation(conversationId);

        return {
            ...conversation,
            messages,
        };
    }

    /**
     * Marquer un message comme lu
     */
    static async markMessageAsRead(messageId: number): Promise<boolean> {
        const result = await pgpDb.result(
            `UPDATE ${kMessages}
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND is_read = FALSE`,
            [messageId]
        );
        return result.rowCount > 0;
    }

    /**
     * Marquer tous les messages d'une conversation comme lus
     */
    static async markConversationAsRead(
        conversationId: number,
        forUser: 'customer' | 'admin'
    ): Promise<number> {
        // Marquer les messages comme lus
        await pgpDb.none(
            `UPDATE ${kMessages}
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE conversation_id = $1
              AND sender_type != $2
              AND is_read = FALSE`,
            [conversationId, forUser]
        );

        // Réinitialiser le compteur de non-lus
        const field = forUser === 'customer' ? 'unread_count_customer' : 'unread_count_admin';
        const result = await pgpDb.result(
            `UPDATE ${kConversations}
            SET ${field} = 0
            WHERE id = $1`,
            [conversationId]
        );

        return result.rowCount;
    }

    /**
     * Supprimer un message (soft delete)
     */
    static async deleteMessage(id: number): Promise<boolean> {
        const result = await pgpDb.result(
            `UPDATE ${kMessages}
            SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
            [id]
        );
        return result.rowCount > 0;
    }

    /**
     * Mettre à jour les données IA d'un message
     */
    static async updateMessageAI(
        messageId: number,
        aiData: {
            ai_processed?: boolean;
            ai_suggested_response?: string;
            ai_confidence?: number;
            ai_intent?: AIIntent;
        }
    ): Promise<boolean> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (aiData.ai_processed !== undefined) {
            fields.push(`ai_processed = $${paramIndex++}`);
            values.push(aiData.ai_processed);
        }

        if (aiData.ai_suggested_response !== undefined) {
            fields.push(`ai_suggested_response = $${paramIndex++}`);
            values.push(aiData.ai_suggested_response);
        }

        if (aiData.ai_confidence !== undefined) {
            fields.push(`ai_confidence = $${paramIndex++}`);
            values.push(aiData.ai_confidence);
        }

        if (aiData.ai_intent !== undefined) {
            fields.push(`ai_intent = $${paramIndex++}`);
            values.push(aiData.ai_intent);
        }

        if (fields.length === 0) return false;

        values.push(messageId);

        const result = await pgpDb.result(
            `UPDATE ${kMessages}
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}`,
            values
        );

        return result.rowCount > 0;
    }

    // ============================================
    // QUICK REPLIES
    // ============================================

    /**
     * Créer un quick reply
     */
    static async createQuickReply(data: CreateQuickReplyDTO): Promise<QuickReply> {
        const {
            title,
            action_type,
            payload,
            icon,
            color,
            display_order,
            requires_auth,
            user_role,
            created_by,
        } = data;

        return await pgpDb.one<QuickReply>(
            `INSERT INTO ${kQuickReplies} (
                title, action_type, payload, icon, color, display_order,
                requires_auth, user_role, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                title,
                action_type,
                JSON.stringify(payload),
                icon || null,
                color || null,
                display_order || 0,
                requires_auth || false,
                user_role || null,
                created_by,
            ]
        );
    }

    /**
     * Récupérer tous les quick replies actifs
     */
    static async getActiveQuickReplies(userRole?: 'customer' | 'admin'): Promise<QuickReply[]> {
        const roleFilter = userRole
            ? `AND (user_role IS NULL OR user_role = $1)`
            : '';
        const params = userRole ? [userRole] : [];

        return await pgpDb.manyOrNone<QuickReply>(
            `SELECT * FROM ${kQuickReplies}
            WHERE is_active = TRUE ${roleFilter}
            ORDER BY display_order ASC, created_at ASC`,
            params
        );
    }

    /**
     * Récupérer un quick reply par ID
     */
    static async getQuickReplyById(id: number): Promise<QuickReply | null> {
        try {
            return await pgpDb.one<QuickReply>(
                `SELECT * FROM ${kQuickReplies} WHERE id = $1`,
                [id]
            );
        } catch {
            return null;
        }
    }

    /**
     * Récupérer plusieurs quick replies par IDs
     */
    static async getQuickRepliesByIds(ids: number[]): Promise<QuickReply[]> {
        if (ids.length === 0) return [];

        return await pgpDb.manyOrNone<QuickReply>(
            `SELECT * FROM ${kQuickReplies}
            WHERE id = ANY($1) AND is_active = TRUE
            ORDER BY display_order ASC`,
            [ids]
        );
    }

    // ============================================
    // AI RESPONSES
    // ============================================

    /**
     * Créer une réponse IA
     */
    static async createAIResponse(data: CreateAIResponseDTO): Promise<AIResponse> {
        const {
            intent,
            keywords,
            pattern,
            response_template,
            response_type,
            language,
            quick_reply_ids,
            priority,
            confidence_threshold,
            trigger_on_first_message,
            max_uses_per_conversation,
            created_by,
        } = data;

        return await pgpDb.one<AIResponse>(
            `INSERT INTO ${kAIResponses} (
                intent, keywords, pattern, response_template, response_type, language,
                quick_reply_ids, priority, confidence_threshold,
                trigger_on_first_message, max_uses_per_conversation, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                intent,
                keywords,
                pattern || null,
                response_template,
                response_type || 'text',
                language || 'en',
                quick_reply_ids || null,
                priority || 0,
                confidence_threshold || 0.7,
                trigger_on_first_message || false,
                max_uses_per_conversation || null,
                created_by,
            ]
        );
    }

    /**
     * Récupérer toutes les réponses IA actives
     */
    static async getActiveAIResponses(): Promise<AIResponse[]> {
        return await pgpDb.manyOrNone<AIResponse>(
            `SELECT * FROM ${kAIResponses}
            WHERE is_active = TRUE
            ORDER BY priority DESC, created_at ASC`
        );
    }

    /**
     * Récupérer les réponses IA par intent
     */
    static async getAIResponsesByIntent(intent: AIIntent): Promise<AIResponse[]> {
        return await pgpDb.manyOrNone<AIResponse>(
            `SELECT * FROM ${kAIResponses}
            WHERE intent = $1 AND is_active = TRUE
            ORDER BY priority DESC`,
            [intent]
        );
    }

    /**
     * Incrémenter le compteur d'utilisation d'une réponse IA
     */
    static async incrementAIResponseUsage(id: number): Promise<boolean> {
        const result = await pgpDb.result(
            `UPDATE ${kAIResponses}
            SET usage_count = usage_count + 1
            WHERE id = $1`,
            [id]
        );
        return result.rowCount > 0;
    }

    // ============================================
    // STATISTIQUES
    // ============================================

    /**
     * Récupérer les statistiques générales du chat
     */
    static async getChatStatistics() {
        const stats = await pgpDb.one(
            `SELECT
                COUNT(*) as total_conversations,
                COUNT(*) FILTER (WHERE status = 'open') as open_conversations,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_conversations,
                COUNT(*) FILTER (WHERE status = 'closed') as closed_conversations,
                COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned_conversations,
                AVG(unread_count_admin) as avg_unread_admin,
                AVG(unread_count_customer) as avg_unread_customer
            FROM ${kConversations}
            WHERE is_deleted = FALSE`
        );

        const messageStats = await pgpDb.one(
            `SELECT
                COUNT(*) as total_messages,
                COUNT(*) FILTER (WHERE sender_type = 'customer') as customer_messages,
                COUNT(*) FILTER (WHERE sender_type = 'admin') as admin_messages,
                COUNT(*) FILTER (WHERE sender_type = 'ai') as ai_messages,
                COUNT(*) FILTER (WHERE ai_processed = TRUE) as ai_processed_messages
            FROM ${kMessages}
            WHERE is_deleted = FALSE`
        );

        return { ...stats, ...messageStats };
    }
}
