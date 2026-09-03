/**
 * Jest Test Setup
 *
 * Global setup for all tests including database mocks
 */

// Mock pg-promise before importing services
jest.mock('../src/config/pgdb', () => ({
    __esModule: true,
    default: {
        one: jest.fn(),
        oneOrNone: jest.fn(),
        any: jest.fn(),
        none: jest.fn(),
        result: jest.fn(),
        tx: jest.fn(),
    }
}));

// Mock file system for QR code generation
jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
// auth.middleware.ts now requires JWT_SECRET to be set (no more insecure
// hardcoded fallback) — provide a test-only value so app.ts can be imported.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-prod';

// Global test timeout
jest.setTimeout(10000);

export {};
