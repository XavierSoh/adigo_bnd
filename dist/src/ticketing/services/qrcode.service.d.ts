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
    validation_token: string;
}
export declare class QRCodeService {
    private static readonly UPLOAD_DIR;
    /**
     * Initialize QR code upload directory
     */
    static init(): void;
    /**
     * Generate validation token for QR code security
     */
    static generateValidationToken(ticketReference: string, customerId: number): string;
    /**
     * Generate QR code data payload (JSON string)
     */
    static generateQRCodeData(data: QRCodeData): string;
    /**
     * Generate QR code image and save to file
     *
     * @param qrData - JSON string containing ticket information
     * @param ticketReference - Ticket reference for filename
     * @returns Path to generated QR code image
     */
    static generateQRCodeImage(qrData: string, ticketReference: string): Promise<string>;
    /**
     * Generate QR code as data URL (base64)
     * Useful for email attachments or mobile app display
     */
    static generateQRCodeDataURL(qrData: string): Promise<string>;
    /**
     * Verify QR code data integrity
     */
    static verifyQRCodeData(qrData: string): {
        valid: boolean;
        data?: QRCodeData;
        error?: string;
    };
    /**
     * Delete QR code file
     */
    static deleteQRCodeImage(filepath: string): boolean;
}
