import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { timezoneCompatExtension } from '../utils/prisma-timezone-extension';

dotenv.config();

// Singleton PrismaClient for the app. Prisma 7 always requires an explicit
// driver adapter (no bundled query engine binary anymore) — see
// prisma.config.ts for the CLI-side (introspection/migrate) counterpart.
//
// pg-promise (`pgpDb` / src/config/pgdb.ts) has been fully retired. The app
// is migrating off raw SQL (src/utils/prisma-compat.ts's `pgOne`/`pgAny`/...
// shim) onto Prisma's native model API (`.findMany()`/`.create()`/...) —
// see BOOKING_MODULE_NOTES.md. `timezoneCompatExtension` is what makes that
// safe: it re-anchors every DateTime field, on every model, on every
// operation, so the JSON this API returns is unchanged from the raw-SQL-era
// behavior. Every caller — including the prisma-compat shim during the
// transition — must go through this exported (extended) client, never a
// bare `new PrismaClient()`.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prismaDb = new PrismaClient({ adapter }).$extends(timezoneCompatExtension);

export default prismaDb;
