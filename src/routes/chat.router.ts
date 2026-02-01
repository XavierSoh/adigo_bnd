import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { uploadChatMedia } from '../middleware/upload.chat.middleware';

const chatRouter = Router();

// ============================================
// ROUTES CONVERSATIONS
// ============================================

// Créer une conversation
chatRouter.post('/conversations', ChatController.createConversation);

// Récupérer les conversations d'un client (MUST be before /:id)
chatRouter.get('/conversations/customer/:customerId', ChatController.getConversationsByCustomer);

// Récupérer les conversations assignées à un admin (MUST be before /:id)
chatRouter.get('/conversations/admin/:adminId', ChatController.getConversationsByAdmin);

// Récupérer les conversations ouvertes (non assignées) (MUST be before /:id)
chatRouter.get('/conversations/open', ChatController.getOpenConversations);

// Récupérer une conversation par ID
chatRouter.get('/conversations/:id', ChatController.getConversationById);

// Récupérer une conversation avec ses messages
chatRouter.get('/conversations/:id/messages', ChatController.getConversationWithMessages);

// Mettre à jour une conversation
chatRouter.put('/conversations/:id', ChatController.updateConversation);

// Assigner une conversation à un admin
chatRouter.post('/conversations/:id/assign', ChatController.assignConversation);

// Marquer tous les messages d'une conversation comme lus
chatRouter.patch('/conversations/:id/read', ChatController.markConversationAsRead);

// Supprimer une conversation
chatRouter.delete('/conversations/:id', ChatController.deleteConversation);

// ============================================
// ROUTES MESSAGES
// ============================================

// Upload file/image for chat
chatRouter.post('/upload', uploadChatMedia.single('file'), ChatController.uploadChatFile);

// Créer un message
chatRouter.post('/messages', ChatController.createMessage);

// Récupérer les messages d'une conversation
chatRouter.get('/conversations/:id/messages/list', ChatController.getMessagesByConversation);

// Marquer un message comme lu
chatRouter.patch('/messages/:id/read', ChatController.markMessageAsRead);

// Obtenir une suggestion IA pour un message
chatRouter.get('/messages/:id/ai-suggestion', ChatController.getAISuggestion);

// Supprimer un message
chatRouter.delete('/messages/:id', ChatController.deleteMessage);

// ============================================
// ROUTES QUICK REPLIES
// ============================================

// Créer un quick reply
chatRouter.post('/quick-replies', ChatController.createQuickReply);

// Récupérer les quick replies actifs
chatRouter.get('/quick-replies', ChatController.getQuickReplies);

// ============================================
// ROUTES AI RESPONSES
// ============================================

// Créer une réponse IA
chatRouter.post('/ai-responses', ChatController.createAIResponse);

// Récupérer les réponses IA actives
chatRouter.get('/ai-responses', ChatController.getAIResponses);

// ============================================
// ROUTES STATISTIQUES
// ============================================

// Récupérer les statistiques du chat
chatRouter.get('/statistics', ChatController.getChatStatistics);

// ============================================
// ROUTES PRESENCE
// ============================================

// Get all online customers
chatRouter.get('/presence/online', ChatController.getOnlineCustomers);

// Get online status for specific customers
chatRouter.post('/presence/status', ChatController.getCustomersStatus);

export default chatRouter;
