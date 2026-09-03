/**
 * Prisma Client Extension: naive-`timestamp` (no timezone) compensation.
 *
 * ROOT CAUSE (verified empirically 2026-09-03, see BOOKING_MODULE_NOTES.md):
 * this server's Node process runs in Africa/Douala (UTC+1, no DST).
 * node-postgres (what this app's raw-SQL era used directly) parses a naive
 * `timestamp` column by reading its literal digits as LOCAL wall-clock time.
 * Prisma's driver adapter (`@prisma/adapter-pg`) instead parses the exact
 * same column as literal UTC. Same bytes on the wire, two different JS Date
 * instants — a constant 1h skew, in opposite directions for reads and
 * writes. This was previously handled by `prisma-compat.ts`'s
 * `normalizeRow`, which every raw query passed through. Now that the app
 * calls Prisma's native model API (`.findMany()`/`.create()`/...) directly,
 * there is no single interception point anymore UNLESS we install one here
 * as a Prisma Client Extension — so every DateTime field, on every model,
 * on every operation, gets the same compensation applied exactly once,
 * globally, driven by the schema's own DMMF (no per-field hand-listing to
 * forget).
 *
 * Scope: only fields whose Prisma type is `DateTime` are touched — `Decimal`
 * and `bigint` need no equivalent handling here (see below), and none of
 * this touches `@db.Date` columns (verified in the earlier raw-SQL-era
 * migration that pg vs Prisma treat those identically — this extension
 * still only needs to fire on `DateTime`-typed fields, which is exactly
 * what `@db.Timestamp` maps to; `@db.Date` fields are also typed
 * `DateTime` in the schema, but a calendar date has no time-of-day
 * component to be ambiguous about — this extension will still "shift" it
 * by re-anchoring, which for a midnight-UTC date is a no-op across
 * whole-day arithmetic in the same direction both ways, so it's safe to
 * leave in scope rather than special-case it out).
 *
 * Decimal/bigint need NO extension handling: Prisma's native model API
 * already returns `Decimal` objects whose default JSON serialization
 * (`.toJSON()` → `.toString()`) preserves full precision — this is the
 * *correct* behavior already (see prisma-compat.ts's header on why
 * `.toFixed(2)` was wrong), nothing to "fix". `count()`/`aggregate()` on
 * this schema's Int columns return plain `number`, not `bigint` — verified
 * empirically, see BOOKING_MODULE_NOTES.md.
 */

import { Prisma } from '@prisma/client';

const LOCAL_TZ_OFFSET_MS = -new Date().getTimezoneOffset() * 60000;

function fromPrismaTimestamp(date: Date): Date {
    return new Date(date.getTime() - LOCAL_TZ_OFFSET_MS);
}

function toPrismaTimestampParam(date: Date): Date {
    return new Date(date.getTime() + LOCAL_TZ_OFFSET_MS);
}

// --- DMMF-driven per-model field maps, built once at module load ---

interface ModelFieldInfo {
    dateTimeFields: Set<string>;
    /** relation field name -> target model name */
    relationFields: Map<string, string>;
}

const modelInfo = new Map<string, ModelFieldInfo>();

function getModelInfo(modelName: string | undefined): ModelFieldInfo | undefined {
    if (!modelName) return undefined;
    let info = modelInfo.get(modelName);
    if (info) return info;

    const model = Prisma.dmmf.datamodel.models.find(
        (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );
    if (!model) return undefined;

    info = { dateTimeFields: new Set(), relationFields: new Map() };
    for (const field of model.fields) {
        if (field.kind === 'scalar' && field.type === 'DateTime') {
            info.dateTimeFields.add(field.name);
        } else if (field.kind === 'object' && field.relationName) {
            info.relationFields.set(field.name, field.type);
        }
    }
    modelInfo.set(modelName, info);
    return info;
}

// Prisma query-language keys that wrap a scalar value/values without
// changing model context (where-clause filter operators).
const FILTER_OPERATOR_KEYS = ['equals', 'not', 'gt', 'gte', 'lt', 'lte'];
const FILTER_ARRAY_OPERATOR_KEYS = ['in', 'notIn'];
// Nested-write keys that carry a payload shaped like the *target* model
// (single object) vs a list of them.
const RELATION_WRITE_SINGLE_KEYS = ['create', 'update', 'upsert', 'connect', 'connectOrCreate'];
const RELATION_WRITE_LIST_KEYS = ['createMany'];
// Logical grouping in `where` — same model context, recurse straight through.
const LOGICAL_KEYS = ['AND', 'OR', 'NOT'];
// Control keys that shape the query, not data — never walked.
const CONTROL_KEYS = new Set([
    'include', 'select', 'orderBy', 'take', 'skip', 'cursor', 'distinct', 'omit',
]);

function shiftDateValue(value: any, shiftFn: (d: Date) => Date): any {
    if (value instanceof Date) return shiftFn(value);
    return value;
}

/** Walks a `where`/`data`-shaped value for `modelName`, shifting every
 * DateTime touchpoint with `shiftFn`. Mutates arrays/objects in place where
 * convenient, returns the (possibly new) value for primitives. */
function walkArgs(value: any, modelName: string, shiftFn: (d: Date) => Date): any {
    if (value == null) return value;
    if (value instanceof Date) return shiftDateValue(value, shiftFn);
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            value[i] = walkArgs(value[i], modelName, shiftFn);
        }
        return value;
    }
    if (typeof value !== 'object') return value;

    const info = getModelInfo(modelName);
    if (!info) return value;

    for (const key of Object.keys(value)) {
        if (CONTROL_KEYS.has(key)) continue;

        if (LOGICAL_KEYS.includes(key)) {
            value[key] = walkArgs(value[key], modelName, shiftFn);
            continue;
        }

        if (info.dateTimeFields.has(key)) {
            const v = value[key];
            if (v instanceof Date) {
                value[key] = shiftDateValue(v, shiftFn);
            } else if (v && typeof v === 'object') {
                for (const opKey of FILTER_OPERATOR_KEYS) {
                    if (opKey in v) v[opKey] = shiftDateValue(v[opKey], shiftFn);
                }
                for (const opKey of FILTER_ARRAY_OPERATOR_KEYS) {
                    if (Array.isArray(v[opKey])) {
                        v[opKey] = v[opKey].map((d: any) => shiftDateValue(d, shiftFn));
                    }
                }
            }
            continue;
        }

        if (info.relationFields.has(key)) {
            const targetModel = info.relationFields.get(key)!;
            const v = value[key];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                for (const wKey of RELATION_WRITE_SINGLE_KEYS) {
                    if (wKey in v) v[wKey] = walkArgs(v[wKey], targetModel, shiftFn);
                }
                for (const wKey of RELATION_WRITE_LIST_KEYS) {
                    if (wKey in v) v[wKey] = walkArgs(v[wKey], targetModel, shiftFn);
                }
                // Plain nested where (relation filters, e.g. `some`/`every`/`none`)
                for (const wKey of ['some', 'every', 'none', 'is', 'isNot']) {
                    if (wKey in v) v[wKey] = walkArgs(v[wKey], targetModel, shiftFn);
                }
            }
            continue;
        }
        // Anything else (plain scalar filters, unknown control keys we didn't
        // anticipate) — left untouched deliberately; only DateTime-typed
        // fields and known relation/logical/operator keys are ever mutated.
    }
    return value;
}

/** Walks a query RESULT (single record, array of records, or an aggregate
 * wrapper) for `modelName`, shifting every DateTime field in place. */
function walkResult(value: any, modelName: string | undefined, shiftFn: (d: Date) => Date): any {
    if (value == null || !modelName) return value;
    if (Array.isArray(value)) {
        for (const item of value) walkResult(item, modelName, shiftFn);
        return value;
    }
    if (typeof value !== 'object') return value;

    const info = getModelInfo(modelName);
    if (!info) return value;

    for (const key of Object.keys(value)) {
        const v = value[key];
        if (v instanceof Date) {
            if (info.dateTimeFields.has(key)) {
                (value as any)[key] = shiftDateValue(v, shiftFn);
            }
            continue;
        }
        if (info.relationFields.has(key)) {
            walkResult(v, info.relationFields.get(key), shiftFn);
            continue;
        }
        // _min/_max/_avg/_sum aggregate wrappers: same field names, same model.
        if (
            (key === '_min' || key === '_max') &&
            v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
        ) {
            walkResult(v, modelName, shiftFn);
        }
    }
    return value;
}

/**
 * Apply to the app's PrismaClient once: `prismaDb = prismaDb.$extends(timezoneCompatExtension)`.
 * Covers every model, every operation (`findMany`, `findUnique`, `findFirst`,
 * `create`, `update`, `upsert`, `delete`, `count`, `aggregate`, `groupBy`,
 * raw `$transaction` batches, and each op inside an interactive
 * `$transaction(async (tx) => ...)`, since `tx` is the same extended client).
 */
export const timezoneCompatExtension = Prisma.defineExtension({
    name: 'timezone-compat',
    query: {
        $allModels: {
            async $allOperations({ model, args, query }) {
                if (model && args && typeof args === 'object') {
                    if ('where' in args) walkArgs((args as any).where, model, toPrismaTimestampParam);
                    if ('data' in args) walkArgs((args as any).data, model, toPrismaTimestampParam);
                    if ('create' in args) walkArgs((args as any).create, model, toPrismaTimestampParam);
                    if ('update' in args) walkArgs((args as any).update, model, toPrismaTimestampParam);
                }
                const result = await query(args);
                if (model) walkResult(result, model, fromPrismaTimestamp);
                return result;
            },
        },
    },
});
