/**
 * Point 3 (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md): sendToDevice's exact FCM
 * message shape is what decides whether a push auto-displays via the OS
 * (notification-message) or is left entirely to the app's own handler
 * (data-only) — the whole mechanism the driver-offer full-screen alert
 * depends on. Mocks `firebase-admin` itself (not NotificationService, which
 * IS the module under test here) so the real message.send() call shape is
 * actually exercised, not bypassed.
 *
 * The module under test calls its own initializeFirebase() at import time,
 * reading process.env — a static top-of-file `import` would run (via JS
 * import hoisting) before any beforeAll() hook gets a chance to set those
 * env vars, so this loads it with a plain `require()` inside beforeAll
 * instead, after the env is in place.
 */

const mockSend = jest.fn().mockResolvedValue('mock-message-id');

jest.mock('firebase-admin', () => ({
    apps: [],
    credential: { cert: jest.fn(() => ({})) },
    initializeApp: jest.fn(),
    messaging: jest.fn(() => ({ send: mockSend, sendEachForMulticast: jest.fn() })),
}));

// Force the "Method 2: env vars" credential path deterministically, so this
// test doesn't depend on whether a real firebase-service-account.json
// happens to exist on disk in whatever environment it runs in.
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(() => false),
}));

const ORIGINAL_ENV = process.env;
// eslint-disable-next-line @typescript-eslint/no-var-requires
let NotificationService: typeof import('../../src/services/notification.service').NotificationService;

beforeAll(() => {
    process.env = {
        ...ORIGINAL_ENV,
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_PRIVATE_KEY: 'test-key',
        FIREBASE_CLIENT_EMAIL: 'test@example.com',
    };
    jest.resetModules();
    NotificationService = require('../../src/services/notification.service').NotificationService;
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

beforeEach(() => {
    mockSend.mockClear();
});

describe('NotificationService.sendToDevice', () => {
    it('is initialized once test env vars are in place (sanity check for the rest of this file)', () => {
        expect(NotificationService.isAvailable()).toBe(true);
    });

    it('a normal push includes a top-level notification block and the given channel', async () => {
        await NotificationService.sendToDevice('token-123', {
            title: 'Titre',
            body: 'Corps',
            androidChannelId: 'vtc_channel',
        });

        expect(mockSend).toHaveBeenCalledTimes(1);
        const [message] = mockSend.mock.calls[0];
        expect(message.notification).toEqual({ title: 'Titre', body: 'Corps' });
        expect(message.android.notification.channelId).toBe('vtc_channel');
    });

    it('defaults to the chat_messages channel when none is given (unchanged behavior)', async () => {
        await NotificationService.sendToDevice('token-123', { title: 'T', body: 'B' });

        const [message] = mockSend.mock.calls[0];
        expect(message.android.notification.channelId).toBe('chat_messages');
    });

    it('a dataOnly push has NO top-level notification block, and folds title/body into data', async () => {
        await NotificationService.sendToDevice('token-123', {
            title: 'Nouvelle course',
            body: 'Akwa',
            data: { type: 'vtc_ride_offered', ride_id: '42' },
            androidChannelId: 'vtc_driver_offer_channel',
            dataOnly: true,
        });

        const [message] = mockSend.mock.calls[0];
        expect(message.notification).toBeUndefined();
        expect(message.android.notification).toBeUndefined();
        expect(message.data).toEqual({
            type: 'vtc_ride_offered',
            ride_id: '42',
            title: 'Nouvelle course',
            body: 'Akwa',
        });
        // High priority so a data-only message is delivered promptly
        // enough to actually wake a backgrounded/killed app's handler —
        // this is what makes the whole mechanism time-sensitive-usable.
        expect(message.android.priority).toBe('high');
    });
});
