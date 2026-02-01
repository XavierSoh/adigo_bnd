import { QRCodeService, QRCodeData } from '../../src/services/qrcode.service';
import QRCode from 'qrcode';
import fs from 'fs';

// Mock QRCode library
jest.mock('qrcode');
jest.mock('fs');

describe('QRCodeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateValidationToken', () => {
        it('should generate a 16-character validation token', () => {
            const token = QRCodeService.generateValidationToken('TKT-2025-123456', 123);

            expect(token).toBeDefined();
            expect(token.length).toBe(16);
            expect(typeof token).toBe('string');
        });

        it('should generate different tokens for different inputs', () => {
            const token1 = QRCodeService.generateValidationToken('TKT-2025-123456', 123);
            const token2 = QRCodeService.generateValidationToken('TKT-2025-654321', 456);

            expect(token1).not.toBe(token2);
        });
    });

    describe('generateQRCodeData', () => {
        it('should generate valid JSON string from QR data', () => {
            const qrData: QRCodeData = {
                ticket_reference: 'TKT-2025-123456',
                event_id: 10,
                customer_id: 123,
                ticket_type_id: 2,
                purchase_id: 100,
                validation_token: 'abc123def456'
            };

            const jsonString = QRCodeService.generateQRCodeData(qrData);

            expect(jsonString).toBeDefined();
            expect(() => JSON.parse(jsonString)).not.toThrow();

            const parsed = JSON.parse(jsonString);
            expect(parsed.ticket_reference).toBe('TKT-2025-123456');
            expect(parsed.event_id).toBe(10);
            expect(parsed.customer_id).toBe(123);
        });
    });

    describe('generateQRCodeImage', () => {
        it('should generate QR code image and return path', async () => {
            const mockToFile = jest.fn().mockResolvedValue(undefined);
            (QRCode.toFile as jest.Mock) = mockToFile;
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

            const qrData = JSON.stringify({ ticket_reference: 'TKT-2025-123456' });
            const path = await QRCodeService.generateQRCodeImage(qrData, 'TKT-2025-123456');

            expect(path).toContain('uploads/qrcodes/');
            expect(path).toContain('TKT-2025-123456');
            expect(path).toContain('.png');
            expect(mockToFile).toHaveBeenCalled();
        });

        it('should create directory if it does not exist', async () => {
            (QRCode.toFile as jest.Mock).mockResolvedValue(undefined);
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const mockMkdir = jest.fn();
            (fs.mkdirSync as jest.Mock) = mockMkdir;

            const qrData = JSON.stringify({ ticket_reference: 'TKT-2025-123456' });
            await QRCodeService.generateQRCodeImage(qrData, 'TKT-2025-123456');

            expect(mockMkdir).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            (QRCode.toFile as jest.Mock).mockRejectedValue(new Error('File write error'));

            const qrData = JSON.stringify({ ticket_reference: 'TKT-2025-123456' });

            await expect(
                QRCodeService.generateQRCodeImage(qrData, 'TKT-2025-123456')
            ).rejects.toThrow('Failed to generate QR code image');
        });
    });

    describe('generateQRCodeDataURL', () => {
        it('should generate base64 data URL', async () => {
            const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
            (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockDataUrl);

            const qrData = JSON.stringify({ ticket_reference: 'TKT-2025-123456' });
            const dataUrl = await QRCodeService.generateQRCodeDataURL(qrData);

            expect(dataUrl).toBe(mockDataUrl);
            expect(dataUrl).toContain('data:image/png;base64,');
        });

        it('should handle errors gracefully', async () => {
            (QRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('Generation error'));

            const qrData = JSON.stringify({ ticket_reference: 'TKT-2025-123456' });

            await expect(
                QRCodeService.generateQRCodeDataURL(qrData)
            ).rejects.toThrow('Failed to generate QR code data URL');
        });
    });

    describe('verifyQRCodeData', () => {
        it('should verify valid QR code data', () => {
            const validData: QRCodeData = {
                ticket_reference: 'TKT-2025-123456',
                event_id: 10,
                customer_id: 123,
                ticket_type_id: 2,
                purchase_id: 100,
                validation_token: 'abc123'
            };

            const qrDataString = JSON.stringify(validData);
            const result = QRCodeService.verifyQRCodeData(qrDataString);

            expect(result.valid).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.ticket_reference).toBe('TKT-2025-123456');
            expect(result.error).toBeUndefined();
        });

        it('should reject invalid JSON', () => {
            const invalidJson = 'not valid json{]';
            const result = QRCodeService.verifyQRCodeData(invalidJson);

            expect(result.valid).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Invalid QR code data format');
        });

        it('should reject data with missing required fields', () => {
            const incompleteData = {
                ticket_reference: 'TKT-2025-123456',
                // Missing other required fields
            };

            const qrDataString = JSON.stringify(incompleteData);
            const result = QRCodeService.verifyQRCodeData(qrDataString);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Missing required fields');
        });
    });

    describe('deleteQRCodeImage', () => {
        it('should delete existing QR code file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            const mockUnlink = jest.fn();
            (fs.unlinkSync as jest.Mock) = mockUnlink;

            const result = QRCodeService.deleteQRCodeImage('uploads/qrcodes/test.png');

            expect(result).toBe(true);
            expect(mockUnlink).toHaveBeenCalled();
        });

        it('should return false if file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = QRCodeService.deleteQRCodeImage('uploads/qrcodes/nonexistent.png');

            expect(result).toBe(false);
        });

        it('should handle errors gracefully', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.unlinkSync as jest.Mock).mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const result = QRCodeService.deleteQRCodeImage('uploads/qrcodes/test.png');

            expect(result).toBe(false);
        });
    });
});
