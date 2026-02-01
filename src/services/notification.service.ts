/**
 * Firebase Cloud Messaging (FCM) Notification Service
 *
 * This service handles push notifications to mobile devices.
 *
 * Setup instructions:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Get your Firebase service account key from Firebase Console
 * 3. Save it as 'firebase-service-account.json' in the project root
 * 4. Add FIREBASE_SERVICE_ACCOUNT_PATH to .env file
 */

import path from 'path';
import fs from 'fs';

// Conditional import - will only work if firebase-admin is installed
let admin: any = null;
let messaging: any = null;

try {
    admin = require('firebase-admin');

    // Initialize Firebase Admin SDK
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                               path.join(__dirname, '../../firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        messaging = admin.messaging();
        console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
        console.warn('⚠️  Firebase service account file not found. Push notifications disabled.');
        console.warn(`   Expected path: ${serviceAccountPath}`);
    }
} catch (error) {
    console.warn('⚠️  Firebase Admin SDK not installed. Push notifications disabled.');
    console.warn('   Run: npm install firebase-admin');
}

export interface NotificationPayload {
    title: string;
    body: string;
    data?: { [key: string]: string };
    imageUrl?: string;
}

export interface ChatNotificationData {
    conversation_id: number;
    message_id: number;
    sender_name: string;
    message_preview: string;
    type: 'new_message' | 'conversation_assigned' | 'conversation_status_changed';
}

export class NotificationService {

    /**
     * Send notification to a single device
     */
    static async sendToDevice(
        fcmToken: string,
        notification: NotificationPayload
    ): Promise<boolean> {
        if (!messaging) {
            console.log('[Notification] FCM not initialized, skipping notification');
            return false;
        }

        try {
            const message: any = {
                token: fcmToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: notification.data || {},
                android: {
                    priority: 'high' as const,
                    notification: {
                        sound: 'default',
                        channelId: 'chat_messages',
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        }
                    }
                }
            };

            if (notification.imageUrl) {
                message.notification.imageUrl = notification.imageUrl;
            }

            const response = await messaging.send(message);
            console.log('[Notification] Successfully sent:', response);
            return true;
        } catch (error: any) {
            console.error('[Notification] Error sending to device:', error);

            // Handle invalid or expired tokens
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                console.log('[Notification] Token is invalid, should be removed from database');
                // TODO: Remove invalid token from database
            }

            return false;
        }
    }

    /**
     * Send notification to multiple devices
     */
    static async sendToMultipleDevices(
        fcmTokens: string[],
        notification: NotificationPayload
    ): Promise<{ successCount: number; failureCount: number }> {
        if (!messaging || fcmTokens.length === 0) {
            console.log('[Notification] FCM not initialized or no tokens provided');
            return { successCount: 0, failureCount: 0 };
        }

        try {
            const message: any = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: notification.data || {},
                android: {
                    priority: 'high' as const,
                    notification: {
                        sound: 'default',
                        channelId: 'chat_messages',
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        }
                    }
                },
                tokens: fcmTokens
            };

            if (notification.imageUrl) {
                message.notification.imageUrl = notification.imageUrl;
            }

            const response = await messaging.sendEachForMulticast(message);
            console.log(`[Notification] Sent to ${response.successCount}/${fcmTokens.length} devices`);

            if (response.failureCount > 0) {
                response.responses.forEach((resp: any, idx: number) => {
                    if (!resp.success) {
                        console.error(`[Notification] Failed for token ${fcmTokens[idx]}:`, resp.error);
                    }
                });
            }

            return {
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error) {
            console.error('[Notification] Error sending to multiple devices:', error);
            return { successCount: 0, failureCount: fcmTokens.length };
        }
    }

    /**
     * Send chat message notification
     */
    static async sendChatMessageNotification(
        fcmToken: string,
        chatData: ChatNotificationData
    ): Promise<boolean> {
        const notification: NotificationPayload = {
            title: chatData.sender_name,
            body: chatData.message_preview,
            data: {
                type: chatData.type,
                conversation_id: chatData.conversation_id.toString(),
                message_id: chatData.message_id.toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                route: `/messages/${chatData.conversation_id}`
            }
        };

        return await this.sendToDevice(fcmToken, notification);
    }

    /**
     * Validate FCM token format
     */
    static isValidToken(token: string): boolean {
        // FCM tokens are typically 152+ characters
        return typeof token === 'string' && token.length > 140;
    }

    /**
     * Check if FCM is available
     */
    static isAvailable(): boolean {
        return messaging !== null;
    }
}
