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

export class SMSNotificationService {

    private static readonly SMS_COST_PER_UNIT = 30; // FCFA

    /**
     * Calculate SMS notification cost
     */
    static calculateCost(config: SMSConfig): SMSPricing {
        const totalCost = config.recipients_count * this.SMS_COST_PER_UNIT;

        return {
            sms_cost_per_unit: this.SMS_COST_PER_UNIT,
            recipients_count: config.recipients_count,
            total_cost: totalCost
        };
    }

    /**
     * Get SMS pricing
     */
    static getPricing(): { cost_per_sms: number } {
        return {
            cost_per_sms: this.SMS_COST_PER_UNIT
        };
    }

    /**
     * Generate message from template
     */
    static generateMessage(
        template: 'reminder' | 'confirmation' | 'custom',
        data: {
            event_title?: string;
            event_date?: string;
            ticket_reference?: string;
            custom_message?: string;
        }
    ): string {
        switch (template) {
            case 'reminder':
                return `Rappel: Votre événement "${data.event_title}" commence bientôt le ${data.event_date}. Ticket: ${data.ticket_reference}`;

            case 'confirmation':
                return `Votre ticket pour "${data.event_title}" a été confirmé! Référence: ${data.ticket_reference}. À bientôt!`;

            case 'custom':
                return data.custom_message || '';

            default:
                return '';
        }
    }

    /**
     * Send SMS (MVP: mock implementation)
     * TODO: Integrate with SMS provider (Twilio, Nexah, etc.)
     */
    static async sendSMS(notification: SMSNotification): Promise<{
        success: boolean;
        message_id?: string;
        error?: string;
    }> {
        try {
            // MVP: Log only
            console.log('📱 SMS Notification (MVP - Not sent):', {
                phone: notification.phone,
                message: notification.message,
                event_id: notification.event_id
            });

            // TODO: Implement actual SMS sending
            // Example with Twilio:
            // const client = twilio(accountSid, authToken);
            // const result = await client.messages.create({
            //     body: notification.message,
            //     from: process.env.TWILIO_PHONE_NUMBER,
            //     to: notification.phone
            // });

            return {
                success: true,
                message_id: `SMS-${Date.now()}-MOCK`
            };
        } catch (error: any) {
            console.error('SMS sending error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send bulk SMS
     */
    static async sendBulkSMS(notifications: SMSNotification[]): Promise<{
        total: number;
        sent: number;
        failed: number;
        results: Array<{ phone: string; success: boolean; error?: string }>;
    }> {
        const results = [];
        let sent = 0;
        let failed = 0;

        for (const notification of notifications) {
            const result = await this.sendSMS(notification);

            if (result.success) {
                sent++;
            } else {
                failed++;
            }

            results.push({
                phone: notification.phone,
                success: result.success,
                error: result.error
            });
        }

        return {
            total: notifications.length,
            sent,
            failed,
            results
        };
    }

    /**
     * Validate phone number (basic validation)
     */
    static validatePhone(phone: string): boolean {
        // Cameroon phone format: +237XXXXXXXXX or 237XXXXXXXXX or 6XXXXXXXX
        const phoneRegex = /^(\+237|237)?[26]\d{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    /**
     * Format phone number for Cameroon
     */
    static formatPhone(phone: string): string {
        const cleaned = phone.replace(/\s/g, '');

        if (cleaned.startsWith('+237')) {
            return cleaned;
        }

        if (cleaned.startsWith('237')) {
            return `+${cleaned}`;
        }

        if (cleaned.startsWith('6') && cleaned.length === 9) {
            return `+237${cleaned}`;
        }

        return cleaned;
    }
}
