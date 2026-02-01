"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatAIService = void 0;
const chat_repository_1 = require("../repository/chat.repository");
/**
 * Service d'IA pour analyser les messages et proposer des réponses automatiques
 */
class ChatAIService {
    /**
     * Analyser un message et déterminer l'intention
     */
    static async analyzeMessage(message) {
        const content = message.content.toLowerCase();
        // Détecter la langue du message (par défaut anglais)
        const language = this.detectLanguage(content);
        // Détecter l'intention
        const intent = this.detectIntent(content);
        // Calculer le score de confiance
        const confidence = this.calculateConfidence(content, intent);
        // Récupérer les réponses IA appropriées
        const aiResponses = await chat_repository_1.ChatRepository.getAIResponsesByIntent(intent);
        // Filtrer par seuil de confiance et langue
        const matchingResponse = aiResponses.find((resp) => resp.is_active &&
            confidence >= resp.confidence_threshold &&
            resp.language === language);
        // Générer la réponse suggérée
        const suggestedResponse = matchingResponse
            ? this.interpolateTemplate(matchingResponse.response_template, message)
            : undefined;
        // Récupérer les quick replies associées
        let quickReplies = [];
        if (matchingResponse?.quick_reply_ids && matchingResponse.quick_reply_ids.length > 0) {
            quickReplies = await chat_repository_1.ChatRepository.getQuickRepliesByIds(matchingResponse.quick_reply_ids);
        }
        else {
            // Si pas de quick replies spécifiques, utiliser les généraux par intent
            quickReplies = await this.getQuickRepliesForIntent(intent);
        }
        // Proposition de réservation si l'intent est 'booking'
        let bookingProposal;
        if (intent === 'booking') {
            bookingProposal = await this.generateBookingProposal(content);
        }
        // Incrémenter le compteur d'utilisation si une réponse a été utilisée
        if (matchingResponse) {
            await chat_repository_1.ChatRepository.incrementAIResponseUsage(matchingResponse.id);
        }
        return {
            intent,
            confidence,
            suggested_response: suggestedResponse,
            quick_replies: quickReplies.length > 0 ? quickReplies : undefined,
            booking_proposal: bookingProposal,
        };
    }
    /**
     * Détecter l'intention d'un message
     */
    static detectIntent(content) {
        const scores = {};
        // Calculer le score pour chaque intention
        for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
            if (intent === 'unknown')
                continue;
            const matchCount = keywords.filter((keyword) => content.includes(keyword)).length;
            if (matchCount > 0) {
                scores[intent] = matchCount;
            }
        }
        // Retourner l'intention avec le score le plus élevé
        if (Object.keys(scores).length === 0) {
            return 'unknown';
        }
        return Object.entries(scores).reduce((a, b) => (b[1] || 0) > (a[1] || 0) ? b : a)[0];
    }
    /**
     * Calculer le score de confiance pour une intention
     */
    static calculateConfidence(content, intent) {
        const keywords = this.intentKeywords[intent];
        if (!keywords || keywords.length === 0)
            return 0.5;
        const matchCount = keywords.filter((keyword) => content.includes(keyword)).length;
        const confidence = Math.min(matchCount / 3, 1.0); // Max 3 mots-clés = 100%
        // Bonus si le message est une question
        if (intent === 'question' && content.includes('?')) {
            return Math.min(confidence + 0.2, 1.0);
        }
        // Bonus si le message contient des mots-clés multiples
        if (matchCount >= 2) {
            return Math.min(confidence + 0.1, 1.0);
        }
        return Math.max(confidence, 0.3); // Minimum 30%
    }
    /**
     * Interpoler un template avec les données du message
     */
    static interpolateTemplate(template, message) {
        let result = template;
        // Variables disponibles
        const variables = {
            sender_name: message.sender_name || 'Client',
            time: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            date: new Date().toLocaleDateString('fr-FR'),
        };
        // Remplacer les variables {{var}}
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return result;
    }
    /**
     * Récupérer les quick replies appropriés pour une intention
     */
    static async getQuickRepliesForIntent(intent) {
        // Mapping intent -> quick reply actions
        const intentToActions = {
            greeting: ['view_trips', 'create_booking', 'contact_support'],
            booking: ['create_booking', 'view_trips'],
            help: ['contact_support', 'view_trips'],
            complaint: ['contact_support'],
            question: ['contact_support', 'view_trips'],
            feedback: ['view_trips'],
            payment: ['check_status', 'contact_support'],
            cancel: ['cancel_booking', 'contact_support'],
            unknown: ['contact_support', 'view_trips'],
        };
        const actions = intentToActions[intent] || [];
        // Récupérer tous les quick replies actifs et filtrer
        const allQuickReplies = await chat_repository_1.ChatRepository.getActiveQuickReplies('customer');
        return allQuickReplies
            .filter((qr) => actions.includes(qr.action_type))
            .slice(0, 3); // Max 3 boutons
    }
    /**
     * Générer une proposition de réservation basée sur le message
     */
    static async generateBookingProposal(content) {
        // Extraire les informations du message (destinations, dates, etc.)
        // Ceci est une version simplifiée - vous pouvez améliorer avec NLP
        // Recherche de patterns de destinations (exemple simple)
        const destinations = this.extractDestinations(content);
        if (!destinations.from || !destinations.to) {
            return undefined;
        }
        // TODO: Interroger la base pour trouver des trajets correspondants
        // Pour l'instant, retourner une proposition générique
        return {
            trip_id: 0, // À remplacer par un vrai trip_id
            from: destinations.from,
            to: destinations.to,
            departure_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Demain
            price: 5000,
            available_seats: 20,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        };
    }
    /**
     * Extraire les destinations d'un message
     */
    static extractDestinations(content) {
        const result = {};
        // Villes communes au Gabon
        const cities = [
            'libreville',
            'port-gentil',
            'franceville',
            'oyem',
            'moanda',
            'mouila',
            'lambaréné',
            'tchibanga',
            'koulamoutou',
            'makokou',
            'bitam',
            'mitzic',
            'ntoum',
            'owendo',
        ];
        const lowerContent = content.toLowerCase();
        // Chercher les patterns "de X à Y" ou "X - Y"
        const patterns = [
            /(?:de|depuis)\s+(\w+)(?:\s+(?:à|vers|pour)\s+(\w+))?/i,
            /(\w+)\s*(?:-|→|>)\s*(\w+)/i,
            /(?:aller|partir)\s+(?:à|vers|pour)\s+(\w+)/i,
        ];
        for (const pattern of patterns) {
            const match = lowerContent.match(pattern);
            if (match) {
                // Vérifier si les mots matchés sont des villes
                if (match[1] && cities.includes(match[1].toLowerCase())) {
                    result.from = this.capitalize(match[1]);
                }
                if (match[2] && cities.includes(match[2].toLowerCase())) {
                    result.to = this.capitalize(match[2]);
                }
                if (result.from && result.to)
                    break;
            }
        }
        // Si seulement une destination est trouvée, chercher l'autre
        if (!result.from || !result.to) {
            const foundCities = cities.filter((city) => lowerContent.includes(city));
            if (foundCities.length >= 2) {
                result.from = this.capitalize(foundCities[0]);
                result.to = this.capitalize(foundCities[1]);
            }
            else if (foundCities.length === 1 && !result.from && !result.to) {
                // Si une seule ville trouvée, supposer Libreville comme point de départ
                result.from = 'Libreville';
                result.to = this.capitalize(foundCities[0]);
            }
        }
        return result;
    }
    /**
     * Capitaliser la première lettre
     */
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    /**
     * Détecter la langue d'un message (français ou anglais)
     * Par défaut: anglais
     */
    static detectLanguage(content) {
        // Mots indicateurs de français
        const frenchIndicators = [
            'bonjour', 'merci', 'salut', 'bonsoir', 'oui', 'non',
            'où', 'quoi', 'comment', 'pourquoi', 'quand',
            'réserver', 'voyage', 'billet', 'trajet',
            'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils',
            'un', 'une', 'le', 'la', 'les', 'des',
            'à', 'de', 'pour', 'avec', 'sans',
            'été', 'être', 'avoir', 'faire',
        ];
        // Mots indicateurs d'anglais
        const englishIndicators = [
            'hello', 'thanks', 'yes', 'no', 'hi', 'hey',
            'where', 'what', 'how', 'why', 'when',
            'book', 'travel', 'ticket', 'trip',
            'i', 'you', 'he', 'she', 'we', 'they',
            'a', 'an', 'the',
            'to', 'for', 'with', 'without',
            'is', 'are', 'was', 'were', 'been', 'have', 'has',
        ];
        const lowerContent = content.toLowerCase();
        // Compter les occurrences
        const frenchCount = frenchIndicators.filter(word => lowerContent.includes(word)).length;
        const englishCount = englishIndicators.filter(word => lowerContent.includes(word)).length;
        // Si plus d'indicateurs français, retourner français
        if (frenchCount > englishCount) {
            return 'fr';
        }
        // Par défaut: anglais
        return 'en';
    }
    /**
     * Traiter un message entrant avec l'IA
     */
    static async processIncomingMessage(message) {
        // Analyser le message
        const aiResult = await this.analyzeMessage(message);
        // Mettre à jour le message avec les données IA
        await chat_repository_1.ChatRepository.updateMessageAI(message.id, {
            ai_processed: true,
            ai_suggested_response: aiResult.suggested_response,
            ai_confidence: aiResult.confidence,
            ai_intent: aiResult.intent,
        });
        // Si la confiance est très élevée (>0.9) et qu'il y a une réponse suggérée,
        // envoyer automatiquement la réponse (optionnel)
        if (aiResult.confidence > 0.9 &&
            aiResult.suggested_response &&
            aiResult.intent !== 'complaint') {
            // TODO: Envoyer automatiquement la réponse
            // await ChatRepository.createMessage({
            //     conversation_id: message.conversation_id,
            //     sender_type: 'ai',
            //     message_type: 'text',
            //     content: aiResult.suggested_response,
            // });
        }
    }
    /**
     * Obtenir une réponse IA pour un message spécifique
     */
    static async getAIResponse(messageId) {
        const message = await chat_repository_1.ChatRepository.getMessagesByConversation(messageId);
        if (!message || message.length === 0)
            return null;
        return await this.analyzeMessage(message[0]);
    }
}
exports.ChatAIService = ChatAIService;
/**
 * Mots-clés pour détecter les intentions (français + anglais)
 */
ChatAIService.intentKeywords = {
    greeting: [
        // Français
        'bonjour',
        'salut',
        'bonsoir',
        'bonne journée',
        'coucou',
        // English
        'hello',
        'hi',
        'hey',
        'good morning',
        'good afternoon',
        'good evening',
        'greetings',
    ],
    booking: [
        // Français
        'réserver',
        'réservation',
        'voyage',
        'ticket',
        'billet',
        'trajet',
        'partir',
        'aller',
        'bus',
        'place',
        'siège',
        // English
        'book',
        'booking',
        'reservation',
        'reserve',
        'travel',
        'trip',
        'journey',
        'seat',
        'ticket',
    ],
    help: [
        // Français
        'aide',
        'aider',
        'comment',
        'question',
        'problème',
        'difficulté',
        'comprend pas',
        'expliquer',
        // English
        'help',
        'assist',
        'how',
        'question',
        'problem',
        'issue',
        "don't understand",
        'explain',
        'support',
    ],
    complaint: [
        // Français
        'plainte',
        'mécontente',
        'insatisfait',
        'déçu',
        'problème',
        'mauvais',
        'nul',
        'arnaque',
        'rembourser',
        // English
        'complaint',
        'dissatisfied',
        'unhappy',
        'disappointed',
        'bad',
        'terrible',
        'awful',
        'scam',
        'refund',
    ],
    question: [
        // Français
        'quoi',
        'comment',
        'pourquoi',
        'quand',
        'où',
        'qui',
        'combien',
        '?',
        // English
        'what',
        'how',
        'why',
        'when',
        'where',
        'who',
        'which',
        'how much',
        'how many',
    ],
    feedback: [
        // Français
        'merci',
        'super',
        'excellent',
        'bien',
        'parfait',
        'génial',
        'content',
        'satisfait',
        // English
        'thank',
        'thanks',
        'great',
        'excellent',
        'good',
        'perfect',
        'awesome',
        'wonderful',
        'happy',
        'satisfied',
    ],
    payment: [
        // Français
        'payer',
        'paiement',
        'payé',
        'argent',
        'prix',
        'coût',
        'tarif',
        'montant',
        'mtn',
        'orange',
        'mobile money',
        // English
        'pay',
        'payment',
        'paid',
        'money',
        'price',
        'cost',
        'rate',
        'amount',
        'fee',
    ],
    cancel: [
        // Français
        'annuler',
        'annulation',
        'supprimer',
        'retirer',
        'rembourser',
        'remboursement',
        // English
        'cancel',
        'cancellation',
        'delete',
        'remove',
        'refund',
    ],
    unknown: [],
};
