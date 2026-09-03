/**
 * Jest was listed as a dependency (ts-jest included) but never actually
 * configured anywhere — no preset, no setupFiles wiring — so `npm test`
 * silently failed on every single suite (TS syntax errors, missing mocks).
 * This is the config that was missing.
 */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts', '**/*.test.js'],
    setupFiles: ['<rootDir>/tests/setup.ts'],
    clearMocks: true,
    testTimeout: 10000,
};
