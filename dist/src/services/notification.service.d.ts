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
export interface NotificationPayload {
    title: string;
    body: string;
    data?: {
        [key: string]: string;
    };
    imageUrl?: string;
}
export interface ChatNotificationData {
    conversation_id: number;
    message_id: number;
    sender_name: string;
    message_preview: string;
    type: 'new_message' | 'conversation_assigned' | 'conversation_status_changed';
}
export declare class NotificationService {
    /**
     * Send notification to a single device
     */
    static sendToDevice(fcmToken: string, notification: NotificationPayload): Promise<boolean>;
    /**
     * Send notification to multiple devices
     */
    static sendToMultipleDevices(fcmTokens: string[], notification: NotificationPayload): Promise<{
        successCount: number;
        failureCount: number;
    }>;
    /**
     * Send chat message notification
     */
    static sendChatMessageNotification(fcmToken: string, chatData: ChatNotificationData): Promise<boolean>;
    /**
     * Validate FCM token format
     */
    static isValidToken(token: string): boolean;
    /**
     * Check if FCM is available
     */
    static isAvailable(): boolean;
}
