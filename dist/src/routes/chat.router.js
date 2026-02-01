"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const upload_chat_middleware_1 = require("../middleware/upload.chat.middleware");
const chatRouter = (0, express_1.Router)();
// ============================================
// ROUTES CONVERSATIONS
// ============================================
// Créer une conversation
chatRouter.post('/conversations', chat_controller_1.ChatController.createConversation);
// Récupérer les conversations d'un client (MUST be before /:id)
chatRouter.get('/conversations/customer/:customerId', chat_controller_1.ChatController.getConversationsByCustomer);
// Récupérer les conversations assignées à un admin (MUST be before /:id)
chatRouter.get('/conversations/admin/:adminId', chat_controller_1.ChatController.getConversationsByAdmin);
// Récupérer les conversations ouvertes (non assignées) (MUST be before /:id)
chatRouter.get('/conversations/open', chat_controller_1.ChatController.getOpenConversations);
// Récupérer une conversation par ID
chatRouter.get('/conversations/:id', chat_controller_1.ChatController.getConversationById);
// Récupérer une conversation avec ses messages
chatRouter.get('/conversations/:id/messages', chat_controller_1.ChatController.getConversationWithMessages);
// Mettre à jour une conversation
chatRouter.put('/conversations/:id', chat_controller_1.ChatController.updateConversation);
// Assigner une conversation à un admin
chatRouter.post('/conversations/:id/assign', chat_controller_1.ChatController.assignConversation);
// Marquer tous les messages d'une conversation comme lus
chatRouter.patch('/conversations/:id/read', chat_controller_1.ChatController.markConversationAsRead);
// Supprimer une conversation
chatRouter.delete('/conversations/:id', chat_controller_1.ChatController.deleteConversation);
// ============================================
// ROUTES MESSAGES
// ============================================
// Upload file/image for chat
chatRouter.post('/upload', upload_chat_middleware_1.uploadChatMedia.single('file'), chat_controller_1.ChatController.uploadChatFile);
// Créer un message
chatRouter.post('/messages', chat_controller_1.ChatController.createMessage);
// Récupérer les messages d'une conversation
chatRouter.get('/conversations/:id/messages/list', chat_controller_1.ChatController.getMessagesByConversation);
// Marquer un message comme lu
chatRouter.patch('/messages/:id/read', chat_controller_1.ChatController.markMessageAsRead);
// Obtenir une suggestion IA pour un message
chatRouter.get('/messages/:id/ai-suggestion', chat_controller_1.ChatController.getAISuggestion);
// Supprimer un message
chatRouter.delete('/messages/:id', chat_controller_1.ChatController.deleteMessage);
// ============================================
// ROUTES QUICK REPLIES
// ============================================
// Créer un quick reply
chatRouter.post('/quick-replies', chat_controller_1.ChatController.createQuickReply);
// Récupérer les quick replies actifs
chatRouter.get('/quick-replies', chat_controller_1.ChatController.getQuickReplies);
// ============================================
// ROUTES AI RESPONSES
// ============================================
// Créer une réponse IA
chatRouter.post('/ai-responses', chat_controller_1.ChatController.createAIResponse);
// Récupérer les réponses IA actives
chatRouter.get('/ai-responses', chat_controller_1.ChatController.getAIResponses);
// ============================================
// ROUTES STATISTIQUES
// ============================================
// Récupérer les statistiques du chat
chatRouter.get('/statistics', chat_controller_1.ChatController.getChatStatistics);
// ============================================
// ROUTES PRESENCE
// ============================================
// Get all online customers
chatRouter.get('/presence/online', chat_controller_1.ChatController.getOnlineCustomers);
// Get online status for specific customers
chatRouter.post('/presence/status', chat_controller_1.ChatController.getCustomersStatus);
exports.default = chatRouter;
