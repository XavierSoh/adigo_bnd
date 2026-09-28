/**
 * Parses an ISO date(-time) string that must be unambiguous about which
 * instant it represents.
 *
 * Root cause this guards against (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md,
 * point 5): the desktop admin app used to send a *naive* local wall-clock
 * string for `departure_time`/`arrival_time` (e.g. "2026-09-23T10:00:00.000",
 * no "Z"/offset). `new Date(naiveString)` on this server reads that as UTC
 * (the process runs with `TZ=UTC`, see src/index.ts), so an admin typing
 * "10h" (Cameroon local, UTC+1) silently got stored as 10h UTC = 11h
 * Cameroon — a 1h data-corrupting bug on every trip created, not just a
 * display glitch. Rather than guessing which timezone a naive string meant,
 * reject it: the caller must send either a full offset-qualified
 * date-time, or a bare calendar date (`YYYY-MM-DD`, unambiguous — JS treats
 * date-only ISO strings as UTC midnight per spec, no local-time step
 * involved).
 */

export class AmbiguousDateError extends Error {
    constructor(fieldName: string, value: unknown) {
        super(
            `${fieldName} must be an ISO date-time with an explicit UTC offset ` +
            `(e.g. end with "Z") or a bare "YYYY-MM-DD" date — got: ${JSON.stringify(value)}`
        );
        this.name = 'AmbiguousDateError';
    }
}

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HAS_TZ_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * @throws {AmbiguousDateError} if `value` is a date-time string with no
 * explicit timezone marker.
 */
export function parseTimezoneAwareDate(value: unknown, fieldName: string): Date {
    if (typeof value !== 'string') {
        throw new AmbiguousDateError(fieldName, value);
    }
    const trimmed = value.trim();
    const isUnambiguous = BARE_DATE.test(trimmed) || HAS_TZ_OFFSET.test(trimmed);
    if (!isUnambiguous) {
        throw new AmbiguousDateError(fieldName, value);
    }
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) {
        throw new AmbiguousDateError(fieldName, value);
    }
    return date;
}
