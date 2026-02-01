import app from "./app";
import { config } from "dotenv";
import http from "http";
import { SocketService } from "./services/socket.service";

config();
const port = process.env.PORT || 3800;
const server = http.createServer(app);

// Initialiser Socket.IO pour le chat
SocketService.initialize(server);

server.listen(port, () => {
  console.log(`🚀 ADIGO SERVER STARTED http://localhost:${port}`);
  console.log(`📱 Chat temps réel activé sur Socket.IO`);
});
