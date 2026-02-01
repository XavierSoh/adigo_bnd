"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRCodeService = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class QRCodeService {
    /**
     * Initialize QR code upload directory
     */
    static init() {
        if (!fs_1.default.existsSync(this.UPLOAD_DIR)) {
            fs_1.default.mkdirSync(this.UPLOAD_DIR, { recursive: true });
            console.log(`✅ QR code directory created: ${this.UPLOAD_DIR}`);
        }
    }
    /**
     * Generate validation token for QR code security
     */
    static generateValidationToken(ticketReference, customerId) {
        const data = `${ticketReference}-${customerId}-${Date.now()}`;
        return crypto_1.default.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    /**
     * Generate QR code data payload (JSON string)
     */
    static generateQRCodeData(data) {
        return JSON.stringify(data);
    }
    /**
     * Generate QR code image and save to file
     *
     * @param qrData - JSON string containing ticket information
     * @param ticketReference - Ticket reference for filename
     * @returns Path to generated QR code image
     */
    static async generateQRCodeImage(qrData, ticketReference) {
        try {
            this.init();
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `${ticketReference}-${timestamp}.png`;
            const filepath = path_1.default.join(this.UPLOAD_DIR, filename);
            // Generate QR code image
            await qrcode_1.default.toFile(filepath, qrData, {
                errorCorrectionLevel: 'H', // High error correction
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
        }
        catch (error) {
            console.error('❌ Error generating QR code:', error);
            throw new Error('Failed to generate QR code image');
        }
    }
    /**
     * Generate QR code as data URL (base64)
     * Useful for email attachments or mobile app display
     */
    static async generateQRCodeDataURL(qrData) {
        try {
            const dataUrl = await qrcode_1.default.toDataURL(qrData, {
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
        }
        catch (error) {
            console.error('❌ Error generating QR code data URL:', error);
            throw new Error('Failed to generate QR code data URL');
        }
    }
    /**
     * Verify QR code data integrity
     */
    static verifyQRCodeData(qrData) {
        try {
            const parsed = JSON.parse(qrData);
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
        }
        catch (error) {
            return {
                valid: false,
                error: 'Invalid QR code data format'
            };
        }
    }
    /**
     * Delete QR code file
     */
    static deleteQRCodeImage(filepath) {
        try {
            const fullPath = path_1.default.join(__dirname, '../../', filepath);
            if (fs_1.default.existsSync(fullPath)) {
                fs_1.default.unlinkSync(fullPath);
                console.log(`🗑️  Deleted QR code: ${filepath}`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Error deleting QR code:', error);
            return false;
        }
    }
}
exports.QRCodeService = QRCodeService;
QRCodeService.UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/qrcodes');
