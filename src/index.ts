// Must run before anything else in the process — Prisma's query engine
// interprets `timestamp without time zone` columns (created_at/updated_at
// across the schema, e.g. vtc_rides) using the OS/process local timezone,
// not UTC and not the Postgres session's own TimeZone setting. On this dev
// machine (Windows, "W. Central Africa Standard Time", UTC+1) that made
// every such column come back exactly 1h behind real time — confirmed live
// 2026-09-09 while testing the VTC driver-offer flow: it silently broke
// RideService.isStale's 15-minute "no driver assigned" auto-cancel (every
// 'requested' ride looked >15min old the instant it was created, so it
// auto-cancelled almost immediately instead of after a real 15-minute
// wait). Forcing UTC here makes Prisma's naive-timestamp interpretation
// match what's actually stored (also fixed to genuinely be UTC — see the
// `ALTER DATABASE adigo_db SET timezone TO 'UTC'` run the same day, which
// alone was NOT sufficient: it fixed what Postgres itself computes for
// `now()`/`CURRENT_TIMESTAMP`, but did nothing for how the already-correct
// stored value gets parsed back into a JS Date on this specific machine).
// Placed before any `import` (TypeScript compiles this file to CommonJS,
// preserving source order — unlike ESM, `require()` calls are not hoisted
// above plain statements) so it's set before Prisma's client, or anything
// else that touches `Date`, ever initializes.
process.env.TZ = "UTC";

import app from "./app";
import { config } from "dotenv";
import http from "http";
import { SocketService } from "./services/socket.service";
import prismaDb from "./config/prismaClient";

config();
const port = process.env.PORT || 3800;
const server = http.createServer(app);

// Initialiser Socket.IO pour le chat
SocketService.initialize(server);

server.listen(port, () => {
  console.log(`🚀 ADIGO SERVER STARTED http://localhost:${port}`);
  console.log(`📱 Chat temps réel activé sur Socket.IO`);
});

// Graceful shutdown: release the Prisma connection pool (and stop accepting
// new HTTP connections) instead of leaving the process to kill the pool
// mid-query on SIGINT/SIGTERM (Ctrl+C locally, or a container/orchestrator
// stop in prod).
async function shutdown(signal: string) {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log("✅ HTTP server closed");
  });
  try {
    await prismaDb.$disconnect();
    console.log("✅ Prisma disconnected");
  } catch (error) {
    console.error("❌ Error disconnecting Prisma:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
