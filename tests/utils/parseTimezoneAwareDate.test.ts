import { parseTimezoneAwareDate, AmbiguousDateError } from '../../src/utils/parseTimezoneAwareDate';

describe('parseTimezoneAwareDate', () => {
    it('accepts a Z-suffixed UTC ISO string', () => {
        const date = parseTimezoneAwareDate('2026-09-23T09:00:00.000Z', 'departure_time');
        expect(date.toISOString()).toBe('2026-09-23T09:00:00.000Z');
    });

    it('accepts an explicit positive offset', () => {
        const date = parseTimezoneAwareDate('2026-09-23T10:00:00+01:00', 'departure_time');
        expect(date.toISOString()).toBe('2026-09-23T09:00:00.000Z');
    });

    it('accepts an explicit negative offset without a colon', () => {
        const date = parseTimezoneAwareDate('2026-09-23T05:00:00-0400', 'departure_time');
        expect(date.toISOString()).toBe('2026-09-23T09:00:00.000Z');
    });

    it('accepts a bare calendar date (unambiguous — UTC midnight by spec)', () => {
        const date = parseTimezoneAwareDate('2026-09-23', 'valid_from');
        expect(date.toISOString()).toBe('2026-09-23T00:00:00.000Z');
    });

    it('rejects a naive local date-time string with no offset — this is the exact bug '
        + 'that shifted every trip departure_time by ~1h', () => {
        expect(() => parseTimezoneAwareDate('2026-09-23T10:00:00.000', 'departure_time'))
            .toThrow(AmbiguousDateError);
    });

    it('rejects a naive date-time string without milliseconds too', () => {
        expect(() => parseTimezoneAwareDate('2026-09-23T10:00:00', 'departure_time'))
            .toThrow(AmbiguousDateError);
    });

    it('rejects undefined', () => {
        expect(() => parseTimezoneAwareDate(undefined, 'departure_time')).toThrow(AmbiguousDateError);
    });

    it('rejects a non-date string', () => {
        expect(() => parseTimezoneAwareDate('not-a-date', 'departure_time')).toThrow(AmbiguousDateError);
    });

    it('error message names the offending field, for a debuggable 400', () => {
        try {
            parseTimezoneAwareDate('2026-09-23T10:00:00.000', 'arrival_time');
            fail('expected throw');
        } catch (err) {
            expect((err as Error).message).toContain('arrival_time');
        }
    });
});
