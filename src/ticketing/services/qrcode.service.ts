import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * QRCode Service
 *
 * Handles generation of QR codes for event tickets
 */

export interface QRCodeData {
    ticket_reference: string;
    event_id: number;
    customer_id: number;
    ticket_type_id: number;
    purchase_id: number;
    validation_token: string;  // Unique security token
}

export class QRCodeService {

    private static readonly UPLOAD_DIR = path.join(__dirname, '../../uploads/qrcodes');

    /**
     * Initialize QR code upload directory
     */
    static init(): void {
        if (!fs.existsSync(this.UPLOAD_DIR)) {
            fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
            console.log(`✅ QR code directory created: ${this.UPLOAD_DIR}`);
        }
    }

    /**
     * Generate validation token for QR code security
     */
    static generateValidationToken(ticketReference: string, customerId: number): string {
        const data = `${ticketReference}-${customerId}-${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    /**
     * Generate QR code data payload (JSON string)
     */
    static generateQRCodeData(data: QRCodeData): string {
        return JSON.stringify(data);
    }

    /**
     * Generate QR code image and save to file
     *
     * @param qrData - JSON string containing ticket information
     * @param ticketReference - Ticket reference for filename
     * @returns Path to generated QR code image
     */
    static async generateQRCodeImage(qrData: string, ticketReference: string): Promise<string> {
        try {
            this.init();

            // Generate unique filename
            const timestamp = Date.now();
            const filename = `${ticketReference}-${timestamp}.png`;
            const filepath = path.join(this.UPLOAD_DIR, filename);

            // Generate QR code image
            await QRCode.toFile(filepath, qrData, {
                errorCorrectionLevel: 'H',  // High error correction
                type: 'png',
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            // Return relative path for database storage
            const relativePath = `uploads/qrcodes/${filename}`;
            console.log(`✅ QR code generated: ${relativePath}`);

            return relativePath;

        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            throw new Error('Failed to generate QR code image');
        }
    }

    /**
     * Generate QR code as data URL (base64)
     * Useful for email attachments or mobile app display
     */
    static async generateQRCodeDataURL(qrData: string): Promise<string> {
        try {
            const dataUrl = await QRCode.toDataURL(qrData, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return dataUrl;

        } catch (error) {
            console.error('❌ Error generating QR code data URL:', error);
            throw new Error('Failed to generate QR code data URL');
        }
    }

    /**
     * Verify QR code data integrity
     */
    static verifyQRCodeData(qrData: string): { valid: boolean; data?: QRCodeData; error?: string } {
        try {
            const parsed = JSON.parse(qrData) as QRCodeData;

            // Validate required fields
            if (!parsed.ticket_reference || !parsed.event_id || !parsed.customer_id ||
                !parsed.ticket_type_id || !parsed.purchase_id || !parsed.validation_token) {
                return {
                    valid: false,
                    error: 'Missing required fields in QR code data'
                };
            }

            return {
                valid: true,
                data: parsed
            };

        } catch (error) {
            return {
                valid: false,
                error: 'Invalid QR code data format'
            };
        }
    }

    /**
     * Delete QR code file
     */
    static deleteQRCodeImage(filepath: string): boolean {
        try {
            const fullPath = path.join(__dirname, '../../', filepath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`🗑️  Deleted QR code: ${filepath}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error deleting QR code:', error);
            return false;
        }
    }
}
