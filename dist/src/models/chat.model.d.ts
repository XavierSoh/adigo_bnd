export type ConversationStatus = 'open' | 'pending' | 'closed' | 'archived';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SenderType = 'customer' | 'admin' | 'system' | 'ai';
export type MessageType = 'text' | 'image' | 'file' | 'location' | 'booking_proposal' | 'quick_reply' | 'system';
export type QuickReplyAction = 'create_booking' | 'check_status' | 'view_trips' | 'contact_support' | 'cancel_booking' | 'custom';
export type ResponseType = 'text' | 'quick_replies' | 'booking_form';
export type AIIntent = 'booking' | 'greeting' | 'help' | 'complaint' | 'question' | 'feedback' | 'payment' | 'cancel' | 'unknown';
/**
 * Metadata pour une proposition de réservation
 */
export interface BookingProposalMetadata {
    trip_id: number;
    from: string;
    to: string;
    departure_time: string;
    price: number;
    available_seats: number;
    suggested_seats?: number[];
    expires_at?: string;
}
/**
 * Metadata pour une image
 */
export interface ImageMetadata {
    url: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    size?: number;
}
/**
 * Metadata pour un fichier
 */
export interface FileMetadata {
    url: string;
    filename: string;
    size: number;
    mime_type: string;
}
/**
 * Metadata pour une localisation
 */
export interface LocationMetadata {
    latitude: number;
    longitude: number;
    address?: string;
    place_name?: string;
}
/**
 * Metadata pour un quick reply
 */
export interface QuickReplyMetadata {
    action: QuickReplyAction;
    label: string;
    payload: any;
}
/**
 * Union type pour toutes les métadonnées possibles
 */
export type MessageMetadata = BookingProposalMetadata | ImageMetadata | FileMetadata | LocationMetadata | QuickReplyMetadata | Record<string, any>;
/**
 * Conversation entre un client et un admin
 */
export interface Conversation {
    id: number;
    customer_id: number;
    assigned_to?: number | null;
    status: ConversationStatus;
    priority: ConversationPriority;
    subject?: string;
    tags?: string[];
    unread_count_customer: number;
    unread_count_admin: number;
    last_message_at: string;
    last_message_preview?: string;
    created_at: string;
    updated_at: string;
    closed_at?: string | null;
    is_deleted: boolean;
    deleted_at?: string | null;
    deleted_by?: number | null;
    customer_name?: string;
    admin_name?: string;
    message_count?: number;
}
/**
 * Message dans une conversation
 */
export interface Message {
    id: number;
    conversation_id: number;
    sender_type: SenderType;
    sender_id?: number;
    sender_name?: string;
    message_type: MessageType;
    content: string;
    metadata?: MessageMetadata;
    is_read: boolean;
    read_at?: string | null;
    ai_processed: boolean;
    ai_suggested_response?: string;
    ai_confidence?: number;
    ai_intent?: AIIntent;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at?: string | null;
}
/**
 * Bouton d'action rapide
 */
export interface QuickReply {
    id: number;
    title: string;
    action_type: QuickReplyAction;
    payload: Record<string, any>;
    icon?: string;
    color?: string;
    display_order: number;
    requires_auth: boolean;
    user_role?: 'customer' | 'admin' | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: number;
}
/**
 * Réponse automatique de l'IA
 */
export interface AIResponse {
    id: number;
    intent: AIIntent;
    keywords: string[];
    pattern?: string;
    response_template: string;
    response_type: ResponseType;
    language: 'fr' | 'en';
    quick_reply_ids?: number[];
    priority: number;
    confidence_threshold: number;
    is_active: boolean;
    trigger_on_first_message: boolean;
    max_uses_per_conversation?: number | null;
    usage_count: number;
    success_rate?: number;
    created_at: string;
    updated_at: string;
    created_by?: number;
}
/**
 * DTO pour créer une conversation
 */
export interface CreateConversationDTO {
    customer_id: number;
    subject?: string;
    tags?: string[];
    initial_message?: string;
}
/**
 * DTO pour mettre à jour une conversation
 */
export interface UpdateConversationDTO {
    status?: ConversationStatus;
    priority?: ConversationPriority;
    assigned_to?: number | null;
    subject?: string;
    tags?: string[];
}
/**
 * DTO pour créer un message
 */
export interface CreateMessageDTO {
    conversation_id: number;
    sender_type: SenderType;
    sender_id?: number;
    sender_name?: string;
    message_type: MessageType;
    content: string;
    metadata?: MessageMetadata;
}
/**
 * DTO pour créer un quick reply
 */
export interface CreateQuickReplyDTO {
    title: string;
    action_type: QuickReplyAction;
    payload: Record<string, any>;
    icon?: string;
    color?: string;
    display_order?: number;
    requires_auth?: boolean;
    user_role?: 'customer' | 'admin' | null;
    created_by: number;
}
/**
 * DTO pour créer une réponse IA
 */
export interface CreateAIResponseDTO {
    intent: AIIntent;
    keywords: string[];
    pattern?: string;
    response_template: string;
    response_type?: ResponseType;
    language?: 'fr' | 'en';
    quick_reply_ids?: number[];
    priority?: number;
    confidence_threshold?: number;
    trigger_on_first_message?: boolean;
    max_uses_per_conversation?: number;
    created_by: number;
}
/**
 * Événement envoyé via Socket.IO
 */
export interface SocketEvent {
    event: string;
    data: any;
    timestamp: string;
}
/**
 * Événement de nouveau message
 */
export interface NewMessageEvent extends SocketEvent {
    event: 'new_message';
    data: Message;
}
/**
 * Événement de message lu
 */
export interface MessageReadEvent extends SocketEvent {
    event: 'message_read';
    data: {
        message_id: number;
        conversation_id: number;
        read_by: number;
        read_at: string;
    };
}
/**
 * Événement de typing indicator
 */
export interface TypingEvent extends SocketEvent {
    event: 'typing';
    data: {
        conversation_id: number;
        user_id: number;
        user_name: string;
        is_typing: boolean;
    };
}
/**
 * Événement de changement de statut de conversation
 */
export interface ConversationStatusEvent extends SocketEvent {
    event: 'conversation_status_changed';
    data: {
        conversation_id: number;
        old_status: ConversationStatus;
        new_status: ConversationStatus;
        changed_by: number;
    };
}
/**
 * Réponse avec une conversation complète (avec messages)
 */
export interface ConversationWithMessages extends Conversation {
    messages: Message[];
}
/**
 * Réponse avec suggestions IA
 */
export interface AIProcessingResult {
    intent: AIIntent;
    confidence: number;
    suggested_response?: string;
    quick_replies?: QuickReply[];
    booking_proposal?: BookingProposalMetadata;
}
