/**
 * SMS Notification Service
 *
 * Service SMS pour rappels événements
 * Coût: 30 FCFA/SMS
 */
export interface SMSConfig {
    recipients_count: number;
    message_template?: 'reminder' | 'confirmation' | 'custom';
    custom_message?: string;
}
export interface SMSPricing {
    sms_cost_per_unit: number;
    recipients_count: number;
    total_cost: number;
}
export interface SMSNotification {
    phone: string;
    message: string;
    event_id: number;
    customer_id: number;
}
export declare class SMSNotificationService {
    private static readonly SMS_COST_PER_UNIT;
    /**
     * Calculate SMS notification cost
     */
    static calculateCost(config: SMSConfig): SMSPricing;
    /**
     * Get SMS pricing
     */
    static getPricing(): {
        cost_per_sms: number;
    };
    /**
     * Generate message from template
     */
    static generateMessage(template: 'reminder' | 'confirmation' | 'custom', data: {
        event_title?: string;
        event_date?: string;
        ticket_reference?: string;
        custom_message?: string;
    }): string;
    /**
     * Send SMS (MVP: mock implementation)
     * TODO: Integrate with SMS provider (Twilio, Nexah, etc.)
     */
    static sendSMS(notification: SMSNotification): Promise<{
        success: boolean;
        message_id?: string;
        error?: string;
    }>;
    /**
     * Send bulk SMS
     */
    static sendBulkSMS(notifications: SMSNotification[]): Promise<{
        total: number;
        sent: number;
        failed: number;
        results: Array<{
            phone: string;
            success: boolean;
            error?: string;
        }>;
    }>;
    /**
     * Validate phone number (basic validation)
     */
    static validatePhone(phone: string): boolean;
    /**
     * Format phone number for Cameroon
     */
    static formatPhone(phone: string): string;
}
