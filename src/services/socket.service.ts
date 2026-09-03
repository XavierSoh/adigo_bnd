import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ChatRepository } from '../repository/chat.repository';
import { ChatAIService } from './chatAI.service';
import { NotificationService } from './notification.service';
import { CustomerRepository } from '../repository/customer.repository';
import { DashboardRepository } from '../repository/dashboard.repository';
import {
    CreateMessageDTO,
    Message,
    NewMessageEvent,
    MessageReadEvent,
    TypingEvent,
    ConversationStatusEvent,
} from '../models/chat.model';

/**
 * Service Socket.IO pour la communication en temps réel du chat
 */
export class SocketService {
    private static io: Server;
    private static connectedUsers: Map<number, string> = new Map(); // userId -> socketId

    /**
     * Initialiser Socket.IO
     */
    static initialize(httpServer: HttpServer): void {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*', // À configurer selon vos besoins
                methods: ['GET', 'POST'],
            },
            path: '/socket.io',
        });

        this.setupEventHandlers();

        console.log('✅ Socket.IO initialisé pour le chat');
    }

    /**
     * Configurer les gestionnaires d'événements
     */
    private static setupEventHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log(`🔌 Client connecté: ${socket.id}`);

            // Authentification / identification de l'utilisateur
            socket.on('auth', (data: { user_id: number; user_type: 'customer' | 'admin'; agency_id?: number }) => {
                socket.data.user_id = data.user_id;
                socket.data.user_type = data.user_type;
                socket.data.agency_id = data.agency_id;
                this.connectedUsers.set(data.user_id, socket.id);

                console.log(`✅ Utilisateur ${data.user_id} (${data.user_type}) authentifié`);

                // Envoyer la confirmation d'authentification au client
                socket.emit('auth_success', {
                    user_id: data.user_id,
                    user_type: data.user_type,
                    socket_id: socket.id,
                    message: 'Authentication successful'
                });

                // Rejoindre les rooms des conversations
                this.joinUserConversations(socket, data.user_id, data.user_type);

                // Rejoindre la room dashboard si admin
                if (data.user_type === 'admin') {
                    socket.join('dashboard');
                    if (data.agency_id) {
                        socket.join(`dashboard_agency_${data.agency_id}`);
                    }
                    console.log(`📊 Admin ${data.user_id} joined dashboard rooms`);
                }

                // Broadcast user online status (only for customers)
                if (data.user_type === 'customer') {
                    this.broadcastPresenceChange(data.user_id, 'online');
                }
            });

            // Rejoindre une conversation spécifique
            socket.on('join_conversation', (conversationId: number) => {
                const roomName = `conversation_${conversationId}`;
                socket.join(roomName);
                console.log(`📥 Socket ${socket.id} a rejoint ${roomName}`);

                // Log all sockets in this room
                const socketsInRoom = this.io.sockets.adapter.rooms.get(roomName);
                const socketCount = socketsInRoom ? socketsInRoom.size : 0;
                console.log(`👥 Total sockets in ${roomName}: ${socketCount}`);
                if (socketsInRoom) {
                    console.log(`👥 Socket IDs in room:`, Array.from(socketsInRoom));
                }
            });

            // Quitter une conversation
            socket.on('leave_conversation', (conversationId: number) => {
                socket.leave(`conversation_${conversationId}`);
                console.log(`📤 Socket ${socket.id} a quitté conversation_${conversationId}`);
            });

            // Créer et envoyer un message
            socket.on('send_message', async (data: CreateMessageDTO) => {
                try {
                    // Créer le message en base de données
                    const message = await ChatRepository.createMessage(data);

                    // Traiter avec l'IA si c'est un message client
                    if (data.sender_type === 'customer') {
                        ChatAIService.processIncomingMessage(message)
                            .then(async () => {
                                // Récupérer le message mis à jour avec les données IA
                                const messages = await ChatRepository.getMessagesByConversation(
                                    data.conversation_id
                                );
                                const updatedMessage = messages.find((m) => m.id === message.id);

                                if (updatedMessage && updatedMessage.ai_suggested_response) {
                                    // Envoyer la suggestion IA à l'admin
                                    this.io
                                        .to(`conversation_${data.conversation_id}`)
                                        .emit('ai_suggestion', {
                                            message_id: message.id,
                                            conversation_id: data.conversation_id,
                                            suggested_response: updatedMessage.ai_suggested_response,
                                            confidence: updatedMessage.ai_confidence,
                                            intent: updatedMessage.ai_intent,
                                        });
                                }
                            })
                            .catch((error) =>
                                console.error('Error processing message with AI:', error)
                            );
                    }

                    // Émettre le nouveau message à tous les participants
                    const event: NewMessageEvent = {
                        event: 'new_message',
                        data: message,
                        timestamp: new Date().toISOString(),
                    };

                    console.log(`📤 [SocketService] Emitting new_message to conversation_${data.conversation_id}`);
                    console.log(`📤 [SocketService] Event structure:`, JSON.stringify(event, null, 2));
                    console.log(`📤 [SocketService] Message ID: ${message.id}, Content: ${message.content}`);

                    this.io.to(`conversation_${data.conversation_id}`).emit('new_message', event);

                    console.log(`✅ [SocketService] Message emitted successfully`);

                    // Send push notification to offline customer if message is from admin
                    if (data.sender_type === 'admin') {
                        const conversation = await ChatRepository.getConversationById(data.conversation_id);
                        if (conversation && conversation.customer_id) {
                            const isCustomerOnline = this.isUserConnected(conversation.customer_id);

                            if (!isCustomerOnline) {
                                // Customer is offline, send push notification
                                const customerResponse = await CustomerRepository.findById(conversation.customer_id);
                                const customer = customerResponse.body as any;
                                if (customer && customer.fcm_token && customer.notification_enabled) {
                                    await NotificationService.sendChatMessageNotification(
                                        customer.fcm_token,
                                        {
                                            conversation_id: data.conversation_id,
                                            message_id: message.id,
                                            sender_name: /*data.sender_name*/  'ADIGO SUPPORT',
                                            message_preview: message.content.substring(0, 100),
                                            type: 'new_message'
                                        }
                                    );
                                }
                            }
                        }
                    }

                    // Confirmer au sender
                    socket.emit('message_sent', { success: true, message });
                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('message_sent', {
                        success: false,
                        error: 'Erreur lors de l\'envoi du message',
                    });
                }
            });

            // Marquer un message comme lu
            socket.on('mark_read', async (data: { message_id: number; conversation_id: number }) => {
                try {
                    const success = await ChatRepository.markMessageAsRead(data.message_id);

                    if (success) {
                        const event: MessageReadEvent = {
                            event: 'message_read',
                            data: {
                                message_id: data.message_id,
                                conversation_id: data.conversation_id,
                                read_by: socket.data.user_id,
                                read_at: new Date().toISOString(),
                            },
                            timestamp: new Date().toISOString(),
                        };

                        this.io.to(`conversation_${data.conversation_id}`).emit('message_read', event);
                    }
                } catch (error) {
                    console.error('Error marking message as read:', error);
                }
            });

            // Indicateur de saisie (typing)
            socket.on(
                'typing',
                (data: { conversation_id: number; is_typing: boolean; user_name: string }) => {
                    const event: TypingEvent = {
                        event: 'typing',
                        data: {
                            conversation_id: data.conversation_id,
                            user_id: socket.data.user_id,
                            user_name: data.user_name,
                            is_typing: data.is_typing,
                        },
                        timestamp: new Date().toISOString(),
                    };

                    // Émettre à tous sauf le sender
                    socket.to(`conversation_${data.conversation_id}`).emit('typing', event);
                }
            );

            // Changement de statut de conversation
            socket.on(
                'conversation_status_changed',
                async (data: {
                    conversation_id: number;
                    old_status: any;
                    new_status: any;
                }) => {
                    const event: ConversationStatusEvent = {
                        event: 'conversation_status_changed',
                        data: {
                            conversation_id: data.conversation_id,
                            old_status: data.old_status,
                            new_status: data.new_status,
                            changed_by: socket.data.user_id,
                        },
                        timestamp: new Date().toISOString(),
                    };

                    this.io
                        .to(`conversation_${data.conversation_id}`)
                        .emit('conversation_status_changed', event);
                }
            );

            // ============================================
            // VTC — live tracking / dispatch rooms
            // ============================================

            // A customer (watching their own ride) or an admin (auditing a
            // ride from the desktop) joins this ride's room to receive its
            // GPS points and status changes as they happen.
            socket.on('join_vtc_ride', (rideId: number) => {
                socket.join(`vtc_ride_${rideId}`);
            });

            socket.on('leave_vtc_ride', (rideId: number) => {
                socket.leave(`vtc_ride_${rideId}`);
            });

            // The admin desktop's dispatch/live-map screen joins this once to
            // see every new ride request, status change, and driver position
            // across all rides, without joining each one individually.
            socket.on('join_vtc_dispatch', () => {
                socket.join('vtc_dispatch');
            });

            socket.on('leave_vtc_dispatch', () => {
                socket.leave('vtc_dispatch');
            });

            // Déconnexion
            socket.on('disconnect', () => {
                if (socket.data.user_id) {
                    const userId = socket.data.user_id;
                    const userType = socket.data.user_type;

                    this.connectedUsers.delete(userId);

                    // Broadcast user offline status (only for customers)
                    if (userType === 'customer') {
                        this.broadcastPresenceChange(userId, 'offline');
                    }
                }
                console.log(`❌ Client déconnecté: ${socket.id}`);
            });
        });
    }

    /**
     * Faire rejoindre l'utilisateur à toutes ses conversations
     */
    private static async joinUserConversations(
        socket: Socket,
        userId: number,
        userType: 'customer' | 'admin'
    ): Promise<void> {
        try {
            let conversations;

            if (userType === 'customer') {
                conversations = await ChatRepository.getConversationsByCustomer(userId);
            } else {
                conversations = await ChatRepository.getConversationsByAdmin(userId);
            }

            for (const conversation of conversations) {
                socket.join(`conversation_${conversation.id}`);
            }

            console.log(
                `✅ Utilisateur ${userId} a rejoint ${conversations.length} conversation(s)`
            );
        } catch (error) {
            console.error('Error joining user conversations:', error);
        }
    }

    /**
     * Envoyer un message à une conversation spécifique
     */
    static sendMessageToConversation(conversationId: number, message: Message): void {
        const event: NewMessageEvent = {
            event: 'new_message',
            data: message,
            timestamp: new Date().toISOString(),
        };

        this.io.to(`conversation_${conversationId}`).emit('new_message', event);
    }

    /**
     * Notifier une nouvelle conversation
     */
    static notifyNewConversation(conversation: any): void {
        // Envoyer à tous les admins connectés
        this.io.emit('new_conversation', {
            event: 'new_conversation',
            data: conversation,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Notifier l'assignation d'une conversation
     */
    static notifyConversationAssigned(conversationId: number, adminId: number): void {
        const adminSocketId = this.connectedUsers.get(adminId);

        if (adminSocketId) {
            this.io.to(adminSocketId).emit('conversation_assigned', {
                event: 'conversation_assigned',
                data: { conversation_id: conversationId },
                timestamp: new Date().toISOString(),
            });
        }
    }

    /**
     * Obtenir le nombre d'utilisateurs connectés
     */
    static getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    /**
     * Vérifier si un utilisateur est connecté
     */
    static isUserConnected(userId: number): boolean {
        return this.connectedUsers.has(userId);
    }

    /**
     * Broadcast presence change to all admins
     */
    static broadcastPresenceChange(userId: number, status: 'online' | 'offline'): void {
        console.log(`👤 Broadcasting presence: User ${userId} is ${status}`);

        this.io.emit('user_presence_changed', {
            event: 'user_presence_changed',
            data: {
                user_id: userId,
                status: status,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Get all online customer IDs
     */
    static getOnlineCustomers(): number[] {
        const onlineCustomers: number[] = [];

        this.io.sockets.sockets.forEach((socket) => {
            if (socket.data.user_type === 'customer' && socket.data.user_id) {
                onlineCustomers.push(socket.data.user_id);
            }
        });

        return onlineCustomers;
    }

    /**
     * Get online status for specific customers
     */
    static getCustomersOnlineStatus(customerIds: number[]): Map<number, boolean> {
        const statusMap = new Map<number, boolean>();
        const onlineCustomers = this.getOnlineCustomers();

        customerIds.forEach(customerId => {
            statusMap.set(customerId, onlineCustomers.includes(customerId));
        });

        return statusMap;
    }

    /**
     * Obtenir l'instance Socket.IO
     */
    static getIO(): Server {
        return this.io;
    }

    // ============================================
    // VTC — live tracking / dispatch broadcasts
    // ============================================

    /**
     * Broadcast one GPS point to a ride's own room (customer tracking screen)
     * and to 'vtc_dispatch' (admin desktop live map watching every ride at
     * once) — one write, both audiences updated.
     */
    static broadcastDriverLocation(rideId: number, point: unknown): void {
        const event = {
            event: 'driver_location',
            data: { rideId, point },
            timestamp: new Date().toISOString(),
        };
        this.io.to(`vtc_ride_${rideId}`).emit('driver_location', event);
        this.io.to('vtc_dispatch').emit('driver_location', event);
    }

    /** Broadcast a ride's status change (accepted/arrived/started/completed/cancelled). */
    static broadcastRideStatusChanged(ride: { id: number | string; status: string }): void {
        const event = {
            event: 'ride_status_changed',
            data: ride,
            timestamp: new Date().toISOString(),
        };
        this.io.to(`vtc_ride_${ride.id}`).emit('ride_status_changed', event);
        this.io.to('vtc_dispatch').emit('ride_status_changed', event);
    }

    /** Tell every admin dispatch screen a new ride is waiting for a driver. */
    static broadcastNewRideRequested(ride: unknown): void {
        this.io.to('vtc_dispatch').emit('new_ride_requested', {
            event: 'new_ride_requested',
            data: ride,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Broadcast dashboard update to all connected admins
     */
    static async broadcastDashboardUpdate(agencyId?: number): Promise<void> {
        try {
            const dashboardData = await DashboardRepository.getDashboardData(agencyId);

            if (dashboardData.status) {
                const room = agencyId ? `dashboard_agency_${agencyId}` : 'dashboard';

                this.io.to(room).emit('dashboard_update', {
                    event: 'dashboard_update',
                    data: dashboardData.body,
                    timestamp: new Date().toISOString(),
                });

                console.log(`📊 Dashboard update broadcasted to ${room}`);
            }
        } catch (error) {
            console.error('Error broadcasting dashboard update:', error);
        }
    }

    /**
     * Broadcast specific stat update (for real-time updates)
     */
    static broadcastStatUpdate(
        statType: 'booking' | 'trip' | 'customer' | 'revenue',
        data: any,
        agencyId?: number
    ): void {
        const room = agencyId ? `dashboard_agency_${agencyId}` : 'dashboard';

        this.io.to(room).emit('stat_update', {
            event: 'stat_update',
            stat_type: statType,
            data: data,
            timestamp: new Date().toISOString(),
        });

        console.log(`📊 Stat update (${statType}) broadcasted to ${room}`);
    }

    /**
     * Broadcast new booking notification to all admins
     */
    static async broadcastNewBooking(bookingData: any, agencyId?: number): Promise<void> {
        try {
            const room = agencyId ? `dashboard_agency_${agencyId}` : 'dashboard';

            this.io.to(room).emit('new_booking', {
                event: 'new_booking',
                data: bookingData,
                timestamp: new Date().toISOString(),
            });

            console.log(`🎫 New booking notification broadcasted to ${room}`);

            // Also refresh dashboard data
            await this.broadcastDashboardUpdate(agencyId);
        } catch (error) {
            console.error('Error broadcasting new booking:', error);
        }
    }
}
