// Configuration du CLI Prisma 7 (db pull / migrate). L'URL de connexion
// utilisée par le CLI vit ici depuis Prisma 7 — plus dans schema.prisma.
// PrismaClient (côté application) est configuré séparément dans
// src/config/prismaClient.ts via un adapter (@prisma/adapter-pg) — la
// migration de tous les repositories est terminée (voir BOOKING_MODULE_NOTES.md).
// NOTE: ce projet n'utilise pas Prisma Migrate (pas de prisma/migrations) —
// le schéma est synchronisé via `prisma db pull` après des scripts SQL
// idempotents écrits à la main (adigo_bnd/migrations/*.sql).
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
