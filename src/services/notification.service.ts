import path from 'path';
import fs from 'fs';

let admin: any = null;
let messaging: any = null;

function initializeFirebase() {
  try {
    admin = require('firebase-admin');

    let credential: any = null;

    // Method 1: Load from JSON file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                               path.join(__dirname, '../../firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      credential = admin.credential.cert(serviceAccount);
    }
    // Method 2: Load from environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };
      credential = admin.credential.cert(serviceAccount);
    }

    if (credential && !admin.apps.length) {
      admin.initializeApp({
        credential: credential
      });
      messaging = admin.messaging();
      console.log('= Firebase Admin SDK initialized');
    } else if (!credential) {
      console.warn('_ Firebase credentials not found. Push notifications disabled.');
    }
  } catch (error) {
    console.warn('_ Firebase Admin SDK not installed or error: npm install firebase-admin');
  }
}

initializeFirebase();

export interface NotificationPayload {
    title: string;
    body: string;
    data?: { [key: string]: string };
    imageUrl?: string;
    // Every push used to hardcode the 'chat_messages' Android channel and
    // always include a top-level `notification` block — fine for chat, but
    // a VTC ride offer needs its own channel (distinct ringtone) and, to
    // wake a backgrounded/killed driver app into showing a full-screen
    // accept/decline UI rather than a plain system tray line, a data-only
    // payload the app's own handler controls end to end (see
    // VtcNotificationService.sendRideOffered and
    // UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md point 3).
    androidChannelId?: string;
    dataOnly?: boolean;
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
            const channelId = notification.androidChannelId || 'chat_messages';
            const message: any = {
                token: fcmToken,
                data: notification.data || {},
                android: {
                    // 'high' delivers immediately instead of being batched —
                    // required for a data-only message to actually wake a
                    // backgrounded/killed app's background handler promptly
                    // (the whole point of dataOnly for a time-sensitive ride
                    // offer), not just for notification-message payloads.
                    priority: 'high' as const,
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

            if (notification.dataOnly) {
                // No top-level `notification` block: the OS must not
                // auto-display anything on its own — the app's own
                // foreground/background handler is entirely responsible for
                // building and showing the (possibly full-screen-intent)
                // local notification, on whichever channel it chooses.
                // Title/body still ride along inside `data` so the handler
                // has them without a second round trip.
                message.data = { ...message.data, title: notification.title, body: notification.body };
            } else {
                message.notification = {
                    title: notification.title,
                    body: notification.body,
                };
                message.android.notification = {
                    sound: 'default',
                    channelId,
                };
                if (notification.imageUrl) {
                    message.notification.imageUrl = notification.imageUrl;
                }
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
