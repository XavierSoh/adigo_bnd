"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = require("dotenv");
const http_1 = __importDefault(require("http"));
const socket_service_1 = require("./services/socket.service");
(0, dotenv_1.config)();
const port = process.env.PORT || 3800;
const server = http_1.default.createServer(app_1.default);
// Initialiser Socket.IO pour le chat
socket_service_1.SocketService.initialize(server);
server.listen(port, () => {
    console.log(`🚀 ADIGO SERVER STARTED http://localhost:${port}`);
    console.log(`📱 Chat temps réel activé sur Socket.IO`);
});
