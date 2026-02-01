import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { Message } from '../models/chat.model';
/**
 * Service Socket.IO pour la communication en temps réel du chat
 */
export declare class SocketService {
    private static io;
    private static connectedUsers;
    /**
     * Initialiser Socket.IO
     */
    static initialize(httpServer: HttpServer): void;
    /**
     * Configurer les gestionnaires d'événements
     */
    private static setupEventHandlers;
    /**
     * Faire rejoindre l'utilisateur à toutes ses conversations
     */
    private static joinUserConversations;
    /**
     * Envoyer un message à une conversation spécifique
     */
    static sendMessageToConversation(conversationId: number, message: Message): void;
    /**
     * Notifier une nouvelle conversation
     */
    static notifyNewConversation(conversation: any): void;
    /**
     * Notifier l'assignation d'une conversation
     */
    static notifyConversationAssigned(conversationId: number, adminId: number): void;
    /**
     * Obtenir le nombre d'utilisateurs connectés
     */
    static getConnectedUsersCount(): number;
    /**
     * Vérifier si un utilisateur est connecté
     */
    static isUserConnected(userId: number): boolean;
    /**
     * Broadcast presence change to all admins
     */
    static broadcastPresenceChange(userId: number, status: 'online' | 'offline'): void;
    /**
     * Get all online customer IDs
     */
    static getOnlineCustomers(): number[];
    /**
     * Get online status for specific customers
     */
    static getCustomersOnlineStatus(customerIds: number[]): Map<number, boolean>;
    /**
     * Obtenir l'instance Socket.IO
     */
    static getIO(): Server;
    /**
     * Broadcast dashboard update to all connected admins
     */
    static broadcastDashboardUpdate(agencyId?: number): Promise<void>;
    /**
     * Broadcast specific stat update (for real-time updates)
     */
    static broadcastStatUpdate(statType: 'booking' | 'trip' | 'customer' | 'revenue', data: any, agencyId?: number): void;
    /**
     * Broadcast new booking notification to all admins
     */
    static broadcastNewBooking(bookingData: any, agencyId?: number): Promise<void>;
}
