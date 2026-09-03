/**
 * Compatibility helpers for repositories migrated from pg-promise to Prisma.
 *
 * ROOT CAUSE (verified empirically 2026-09-03, see BOOKING_MODULE_NOTES.md):
 * this server's Node process runs with the local timezone Africa/Douala
 * (UTC+1, no DST). node-postgres — used directly by pg-promise — parses
 * `timestamp without time zone` columns by reading the literal digits as
 * LOCAL wall-clock time. Prisma's driver adapter (`@prisma/adapter-pg`)
 * instead parses the exact same column as literal UTC. Same column, same
 * bytes on the wire, two different JS Date instants — a constant 1h skew
 * (in opposite directions for reads vs. writes) between the two clients.
 *
 * Two more Prisma-specific leaks found the same way:
 *  - NUMERIC/DECIMAL columns arrive as a `Decimal` object (decimal.js-like)
 *    instead of pg-promise's plain string. `.toString()` drops trailing
 *    zeros ("0.00" -> "0") — cosmetic for money (JSON numbers, no client
 *    parses on exact string padding) but NOT for a high-scale column: an
 *    earlier version of this file used a blanket `.toFixed(2)` instead,
 *    which is correct for money but silently truncates anything with more
 *    than 2 decimal places — e.g. VTC's `current_latitude`/`pickup_latitude`
 *    (DECIMAL(10,8)) would go from ~1m GPS accuracy to ~1km. Fixed to
 *    `.toString()`, which preserves every significant digit Postgres sent
 *    regardless of the column's declared scale.
 *  - COUNT(*)/SUM(int) aggregates arrive as native `bigint`, which crashes
 *    `JSON.stringify` outright (Express's res.json included) — pg-promise
 *    always returned these as plain strings.
 *
 * None of this affects values embedded inside SQL `json_build_object(...)`
 * — Postgres serializes those to JSON text server-side, before either
 * driver's row-level type parsing ever runs, so they're byte-identical
 * either way. It only matters for genuine top-level columns (`b.*`,
 * `RETURNING *`, joined columns like `gt.actual_departure_time`).
 *
 * `normalizeRow`/`normalizeRows` fix this defensively and type-drivenly
 * (by instance check, not by a column-name allowlist) so nothing is missed
 * across a query this size, and the JSON this API returns stays
 * byte-identical to the pre-Prisma pg-promise behaviour every existing
 * client (adigo2, adigo_mobile) was built against.
 */

const LOCAL_TZ_OFFSET_MS = -new Date().getTimezoneOffset() * 60000;

/** Re-anchors a Date read via Prisma from a naive `timestamp` column to the
 * instant pg-promise/node-postgres would have produced for the same row. */
export function fromPrismaTimestamp(date: Date): Date {
    return new Date(date.getTime() - LOCAL_TZ_OFFSET_MS);
}

/** Converts a JS Date into the value to bind as a raw-query parameter so
 * Prisma writes the same literal wall-clock text into a naive `timestamp`
 * column that pg-promise/node-postgres would have written for that Date.
 * Use for any Date bound into $queryRawUnsafe/$executeRawUnsafe params. */
export function toPrismaTimestampParam(date: Date | null | undefined): Date | null {
    if (date == null) return null;
    return new Date(date.getTime() + LOCAL_TZ_OFFSET_MS);
}

function isDecimalLike(value: any): boolean {
    return value != null && typeof value === 'object' && typeof value.toFixed === 'function' && typeof value.toNumber === 'function';
}

/** Fixes up one row in place: Date -> pg-promise-equivalent instant,
 * Decimal -> "X.XX" string, bigint -> number. Leaves nested objects/arrays
 * (json_build_object results) untouched — they're already plain, correct
 * JSON produced server-side. */
export function normalizeRow<T extends Record<string, any>>(row: T): T {
    if (!row) return row;
    for (const key of Object.keys(row)) {
        const value = row[key];
        if (value instanceof Date) {
            (row as any)[key] = fromPrismaTimestamp(value);
        } else if (isDecimalLike(value)) {
            (row as any)[key] = value.toString();
        } else if (typeof value === 'bigint') {
            (row as any)[key] = Number(value);
        }
    }
    return row;
}

export function normalizeRows<T extends Record<string, any>>(rows: T[]): T[] {
    rows.forEach(normalizeRow);
    return rows;
}

// ---------------------------------------------------------------------------
// pg-promise-shaped shim over Prisma's raw query methods.
//
// Lets a repository body ported from pg-promise keep the exact same SQL
// text and `$1,$2,...` positional parameters, swapping only the call site
// (`pgpDb.one(sql, params)` -> `pgOne(sql, params)`) — minimizing the
// chance of a transcription mistake on a large, financially-sensitive
// query file. Every row returned goes through `normalizeRow`/`normalizeRows`
// automatically, so callers never see a raw Date/Decimal/bigint leak.
// ---------------------------------------------------------------------------
import prismaDbFull from '../config/prismaClient';
import { Prisma } from '@prisma/client';

/** Anything that can run a raw query the way `prismaDb` and an interactive
 * transaction's `tx` both can — lets every helper below accept either. */
type PrismaQueryable = {
    $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T>;
    $executeRawUnsafe(query: string, ...values: any[]): Promise<number>;
};

// The app's PrismaClient is `.$extends()`-ed across all 39 models — its
// full inferred type is too deep for TS to structurally check against
// `PrismaQueryable` at every `pgOne`/`pgAny`/... call site's default
// parameter (excessively-deep/circular instantiation errors). Cast once,
// here, rather than at each call site — `prismaDbFull` still has
// `$queryRawUnsafe`/`$executeRawUnsafe` at runtime, this only narrows the
// static type.
const prismaDb = prismaDbFull as unknown as PrismaQueryable;

/** Like pg-promise's `db.one`: expects exactly one row, throws otherwise. */
export async function pgOne<T = any>(sql: string, params: any[] = [], client: PrismaQueryable = prismaDb): Promise<T> {
    const rows = await client.$queryRawUnsafe<T[]>(sql, ...params);
    if (rows.length !== 1) {
        throw new Error(`pgOne: expected exactly 1 row, got ${rows.length}`);
    }
    return normalizeRow(rows[0] as any);
}

/** Like pg-promise's `db.oneOrNone`: 0 rows -> null, 1 row -> row, >1 -> throws. */
export async function pgOneOrNone<T = any>(sql: string, params: any[] = [], client: PrismaQueryable = prismaDb): Promise<T | null> {
    const rows = await client.$queryRawUnsafe<T[]>(sql, ...params);
    if (rows.length > 1) {
        throw new Error(`pgOneOrNone: expected 0 or 1 row, got ${rows.length}`);
    }
    return rows.length === 1 ? normalizeRow(rows[0] as any) : null;
}

/** Like pg-promise's `db.any`: any number of rows, including zero. */
export async function pgAny<T = any>(sql: string, params: any[] = [], client: PrismaQueryable = prismaDb): Promise<T[]> {
    const rows = await client.$queryRawUnsafe<T[]>(sql, ...params);
    return normalizeRows(rows as any[]) as any as T[];
}

/** Like pg-promise's `db.none`: statement expected to return no rows. */
export async function pgNone(sql: string, params: any[] = [], client: PrismaQueryable = prismaDb): Promise<void> {
    await client.$executeRawUnsafe(sql, ...params);
}

/** Like pg-promise's `db.result`: returns `{ rowCount }` for the statement. */
export async function pgResult(sql: string, params: any[] = [], client: PrismaQueryable = prismaDb): Promise<{ rowCount: number }> {
    const rowCount = await client.$executeRawUnsafe(sql, ...params);
    return { rowCount };
}

/**
 * Like pg-promise's `db.tx(callback)`: runs `fn` in a single Prisma
 * interactive transaction and passes its `tx` client through — pass that
 * `tx` as the third argument to `pgOne`/`pgAny`/etc. inside `fn` so every
 * statement in the callback shares the same transaction instead of each
 * grabbing its own connection.
 */
export function pgTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    // Same excessively-deep-instantiation issue as the `prismaDb` cast above:
    // reconciling `fn`'s plain `Prisma.TransactionClient` parameter against
    // the `.$extends()`-ed client's own transaction type blows up TS's
    // structural check across all 39 models. Runtime behavior is unaffected
    // — the extension applies to `tx` either way (Prisma preserves
    // extensions through `$transaction`).
    return (prismaDbFull.$transaction as unknown as (fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>)(fn);
}
