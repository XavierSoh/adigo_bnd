// Migrated to Prisma's native model API (prisma.conversations.*,
// prisma.messages.*, prisma.quick_replies.*, prisma.ai_responses.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 4).
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
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

const conversationWithJoins = {
    customer: { select: { first_name: true, last_name: true } },
    users_conversations_assigned_toTousers: { select: { login: true } },
    _count: { select: { messages: { where: { is_deleted: false } } } },
} satisfies Prisma.conversationsInclude;

type ConversationRow = Prisma.conversationsGetPayload<{ include: typeof conversationWithJoins }>;

function mapConversation(row: ConversationRow): Conversation {
    const { customer, users_conversations_assigned_toTousers, _count, ...rest } = row;
    return {
        ...rest,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        admin_name: users_conversations_assigned_toTousers?.login,
        message_count: _count.messages,
    } as unknown as Conversation;
}

// getOpenConversations' original SQL never LEFT JOINs users at all (every
// row it returns has assigned_to IS NULL by definition of the WHERE
// clause) — no `admin_name` key at all in that shape, unlike every other
// list method here. Reproduced with a narrower include/mapper.
const openConversationWithJoins = {
    customer: { select: { first_name: true, last_name: true } },
    _count: { select: { messages: { where: { is_deleted: false } } } },
} satisfies Prisma.conversationsInclude;

function mapOpenConversation(row: Prisma.conversationsGetPayload<{ include: typeof openConversationWithJoins }>): Conversation {
    const { customer, _count, ...rest } = row;
    return {
        ...rest,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        message_count: _count.messages,
    } as unknown as Conversation;
}

export class ChatRepository {
    // ============================================
    // CONVERSATIONS
    // ============================================

    /**
     * Créer une nouvelle conversation
     */
    static async createConversation(data: CreateConversationDTO): Promise<Conversation> {
        const { customer_id, subject, tags, initial_message } = data;

        const conversation = await prismaDb.conversations.create({
            data: {
                customer_id,
                subject: subject || null,
                tags: tags || undefined,
                status: 'open',
            },
        });

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

        return conversation as unknown as Conversation;
    }

    /**
     * Récupérer une conversation par ID
     */
    static async getConversationById(id: number): Promise<Conversation | null> {
        try {
            const row = await prismaDb.conversations.findFirst({
                where: { id, is_deleted: false },
                include: conversationWithJoins,
            });
            return row ? mapConversation(row) : null;
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
        const rows = await prismaDb.conversations.findMany({
            where: { customer_id: customerId, is_deleted: false, ...(status ? { status } : {}) },
            include: conversationWithJoins,
            orderBy: { last_message_at: 'desc' },
        });
        return rows.map(mapConversation);
    }

    /**
     * Récupérer toutes les conversations assignées à un admin
     */
    static async getConversationsByAdmin(
        adminId: number,
        status?: ConversationStatus
    ): Promise<Conversation[]> {
        const rows = await prismaDb.conversations.findMany({
            where: { assigned_to: adminId, is_deleted: false, ...(status ? { status } : {}) },
            include: conversationWithJoins,
            orderBy: { last_message_at: 'desc' },
        });
        return rows.map(mapConversation);
    }

    /**
     * Récupérer toutes les conversations ouvertes (non assignées)
     */
    static async getOpenConversations(): Promise<Conversation[]> {
        const rows = await prismaDb.conversations.findMany({
            where: { assigned_to: null, status: 'open', is_deleted: false },
            include: openConversationWithJoins,
            orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
        });
        return rows.map(mapOpenConversation);
    }

    /**
     * Mettre à jour une conversation
     */
    static async updateConversation(
        id: number,
        data: UpdateConversationDTO
    ): Promise<Conversation | null> {
        const update: Prisma.conversationsUncheckedUpdateInput = { updated_at: new Date() };
        let hasField = false;

        if (data.status !== undefined) {
            update.status = data.status;
            hasField = true;
            // Si fermée, définir closed_at
            if (data.status === 'closed') {
                update.closed_at = new Date();
            }
        }
        if (data.priority !== undefined) { update.priority = data.priority; hasField = true; }
        if (data.assigned_to !== undefined) { update.assigned_to = data.assigned_to; hasField = true; }
        if (data.subject !== undefined) { update.subject = data.subject; hasField = true; }
        if (data.tags !== undefined) { update.tags = data.tags; hasField = true; }

        if (!hasField) return null;

        try {
            const result = await prismaDb.conversations.updateMany({ where: { id, is_deleted: false }, data: update });
            if (result.count === 0) return null;
            return await prismaDb.conversations.findUnique({ where: { id } }) as unknown as Conversation;
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
        const result = await prismaDb.conversations.updateMany({
            where: { id: conversationId, is_deleted: false },
            data: { assigned_to: adminId, updated_at: new Date() },
        });
        return result.count > 0;
    }

    /**
     * Supprimer une conversation (soft delete)
     */
    static async deleteConversation(id: number, deletedBy: number): Promise<boolean> {
        const result = await prismaDb.conversations.updateMany({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy },
        });
        return result.count > 0;
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

        const message = await prismaDb.messages.create({
            data: {
                conversation_id,
                sender_type,
                sender_id: sender_id || null,
                sender_name: sender_name || null,
                message_type,
                content,
                metadata: metadata ?? undefined,
            },
        });

        // Mettre à jour la conversation — `unread_count_<admin|customer>`
        // is a DYNAMIC column name based on who sent the message (the
        // OTHER side's unread counter goes up); reproduced by branching in
        // JS onto the two real, statically-named fields.
        await prismaDb.conversations.updateMany({
            where: { id: conversation_id },
            data: {
                last_message_at: new Date(),
                last_message_preview: content.substring(0, 100),
                updated_at: new Date(),
                ...(sender_type === 'customer'
                    ? { unread_count_admin: { increment: 1 } }
                    : { unread_count_customer: { increment: 1 } }),
            },
        });

        return message as unknown as Message;
    }

    /**
     * Récupérer tous les messages d'une conversation
     */
    static async getMessagesByConversation(
        conversationId: number,
        limit?: number,
        offset?: number
    ): Promise<Message[]> {
        const rows = await prismaDb.messages.findMany({
            where: { conversation_id: conversationId, is_deleted: false },
            orderBy: { created_at: 'asc' },
            ...(limit ? { take: limit } : {}),
            ...(offset ? { skip: offset } : {}),
        });
        return rows as unknown as Message[];
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
        const result = await prismaDb.messages.updateMany({
            where: { id: messageId, is_read: false },
            data: { is_read: true, read_at: new Date() },
        });
        return result.count > 0;
    }

    /**
     * Marquer tous les messages d'une conversation comme lus
     */
    static async markConversationAsRead(
        conversationId: number,
        forUser: 'customer' | 'admin'
    ): Promise<number> {
        // Marquer les messages comme lus
        await prismaDb.messages.updateMany({
            where: { conversation_id: conversationId, sender_type: { not: forUser }, is_read: false },
            data: { is_read: true, read_at: new Date() },
        });

        // Réinitialiser le compteur de non-lus — dynamic column name in
        // the original, reproduced by branching onto the 2 real fields.
        const result = await prismaDb.conversations.updateMany({
            where: { id: conversationId },
            data: forUser === 'customer' ? { unread_count_customer: 0 } : { unread_count_admin: 0 },
        });

        return result.count;
    }

    /**
     * Supprimer un message (soft delete)
     */
    static async deleteMessage(id: number): Promise<boolean> {
        const result = await prismaDb.messages.updateMany({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date() },
        });
        return result.count > 0;
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
        const update: Prisma.messagesUncheckedUpdateInput = {};
        let hasField = false;

        if (aiData.ai_processed !== undefined) { update.ai_processed = aiData.ai_processed; hasField = true; }
        if (aiData.ai_suggested_response !== undefined) { update.ai_suggested_response = aiData.ai_suggested_response; hasField = true; }
        if (aiData.ai_confidence !== undefined) { update.ai_confidence = aiData.ai_confidence; hasField = true; }
        if (aiData.ai_intent !== undefined) { update.ai_intent = aiData.ai_intent; hasField = true; }

        if (!hasField) return false;

        const result = await prismaDb.messages.updateMany({ where: { id: messageId }, data: update });
        return result.count > 0;
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

        const result = await prismaDb.quick_replies.create({
            data: {
                title,
                action_type,
                payload,
                icon: icon || null,
                color: color || null,
                display_order: display_order || 0,
                requires_auth: requires_auth || false,
                user_role: user_role || null,
                created_by,
            },
        });
        return result as unknown as QuickReply;
    }

    /**
     * Récupérer tous les quick replies actifs
     */
    static async getActiveQuickReplies(userRole?: 'customer' | 'admin'): Promise<QuickReply[]> {
        const rows = await prismaDb.quick_replies.findMany({
            where: {
                is_active: true,
                ...(userRole ? { OR: [{ user_role: null }, { user_role: userRole }] } : {}),
            },
            orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }],
        });
        return rows as unknown as QuickReply[];
    }

    /**
     * Récupérer un quick reply par ID
     */
    static async getQuickReplyById(id: number): Promise<QuickReply | null> {
        try {
            const result = await prismaDb.quick_replies.findUnique({ where: { id } });
            return result as unknown as QuickReply | null;
        } catch {
            return null;
        }
    }

    /**
     * Récupérer plusieurs quick replies par IDs
     */
    static async getQuickRepliesByIds(ids: number[]): Promise<QuickReply[]> {
        if (ids.length === 0) return [];

        const rows = await prismaDb.quick_replies.findMany({
            where: { id: { in: ids }, is_active: true },
            orderBy: { display_order: 'asc' },
        });
        return rows as unknown as QuickReply[];
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

        const result = await prismaDb.ai_responses.create({
            data: {
                intent,
                keywords,
                pattern: pattern || null,
                response_template,
                response_type: response_type || 'text',
                language: language || 'en',
                quick_reply_ids: quick_reply_ids || undefined,
                priority: priority || 0,
                confidence_threshold: confidence_threshold ?? 0.7,
                trigger_on_first_message: trigger_on_first_message || false,
                max_uses_per_conversation: max_uses_per_conversation || null,
                created_by,
            },
        });
        return result as unknown as AIResponse;
    }

    /**
     * Récupérer toutes les réponses IA actives
     */
    static async getActiveAIResponses(): Promise<AIResponse[]> {
        const rows = await prismaDb.ai_responses.findMany({
            where: { is_active: true },
            orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
        });
        return rows as unknown as AIResponse[];
    }

    /**
     * Récupérer les réponses IA par intent
     */
    static async getAIResponsesByIntent(intent: AIIntent): Promise<AIResponse[]> {
        const rows = await prismaDb.ai_responses.findMany({
            where: { intent, is_active: true },
            orderBy: { priority: 'desc' },
        });
        return rows as unknown as AIResponse[];
    }

    /**
     * Incrémenter le compteur d'utilisation d'une réponse IA
     */
    static async incrementAIResponseUsage(id: number): Promise<boolean> {
        const result = await prismaDb.ai_responses.updateMany({
            where: { id },
            data: { usage_count: { increment: 1 } },
        });
        return result.count > 0;
    }

    // ============================================
    // STATISTIQUES
    // ============================================

    /**
     * Récupérer les statistiques générales du chat
     */
    static async getChatStatistics() {
        // `COUNT(*) FILTER (WHERE ...)` per status/flag — parallel
        // `.count()` calls; `AVG(...)` via `.aggregate()`.
        const convWhere = { is_deleted: false } as const;
        const [
            total_conversations, open_conversations, pending_conversations, closed_conversations,
            unassigned_conversations, unreadAgg,
        ] = await Promise.all([
            prismaDb.conversations.count({ where: convWhere }),
            prismaDb.conversations.count({ where: { ...convWhere, status: 'open' } }),
            prismaDb.conversations.count({ where: { ...convWhere, status: 'pending' } }),
            prismaDb.conversations.count({ where: { ...convWhere, status: 'closed' } }),
            prismaDb.conversations.count({ where: { ...convWhere, assigned_to: null } }),
            prismaDb.conversations.aggregate({ where: convWhere, _avg: { unread_count_admin: true, unread_count_customer: true } }),
        ]);

        const msgWhere = { is_deleted: false } as const;
        const [total_messages, customer_messages, admin_messages, ai_messages, ai_processed_messages] = await Promise.all([
            prismaDb.messages.count({ where: msgWhere }),
            prismaDb.messages.count({ where: { ...msgWhere, sender_type: 'customer' } }),
            prismaDb.messages.count({ where: { ...msgWhere, sender_type: 'admin' } }),
            prismaDb.messages.count({ where: { ...msgWhere, sender_type: 'ai' } }),
            prismaDb.messages.count({ where: { ...msgWhere, ai_processed: true } }),
        ]);

        return {
            total_conversations, open_conversations, pending_conversations, closed_conversations,
            unassigned_conversations,
            avg_unread_admin: unreadAgg._avg.unread_count_admin ?? 0,
            avg_unread_customer: unreadAgg._avg.unread_count_customer ?? 0,
            total_messages, customer_messages, admin_messages, ai_messages, ai_processed_messages,
        };
    }
}
