/**
 * Jest Test Setup
 *
 * Global setup for all tests including database mocks
 */

// NOTE: pg-promise (`pgpDb` / src/config/pgdb.ts) has been fully retired —
// the whole backend runs on Prisma now (see src/config/prismaClient.ts).
// A jest.mock() for that dead path used to live here; since this file's
// mocks load before every suite in the project, a mock target that no
// longer resolves on disk broke ALL 11 Jest suites at once, not just the
// ones that used to touch pg-promise. Found auditing "l'API orange et les
// paiements des bookings" (2026-09-12) — repositories that still need a
// Prisma double should mock `src/config/prismaClient` (or the repository
// module itself) directly in their own test file instead of here.

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
