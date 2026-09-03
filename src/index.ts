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
