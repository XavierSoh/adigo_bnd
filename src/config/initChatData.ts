import { ChatRepository } from "../repository/chat.repository";
import {
    CreateQuickReplyDTO,
    CreateAIResponseDTO,
} from "../models/chat.model";

/**
 * Initialiser les données par défaut du chat
 */
export default async function initChatData(): Promise<void> {
    try {
        console.log('📱 Initialisation des données du chat...');

        // Vérifier si des quick replies existent déjà
        const existingQuickReplies = await ChatRepository.getActiveQuickReplies();

        if (existingQuickReplies.length === 0) {
            await createDefaultQuickReplies();
        } else {
            console.log('⏭️  Quick replies déjà initialisés');
        }

        // Vérifier si des réponses IA existent déjà
        const existingAIResponses = await ChatRepository.getActiveAIResponses();

        if (existingAIResponses.length === 0) {
            await createDefaultAIResponses();
        } else {
            console.log('⏭️  Réponses IA déjà initialisées');
        }

        console.log('✅ Données du chat initialisées');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des données du chat:', error);
    }
}

/**
 * Créer les quick replies par défaut
 */
async function createDefaultQuickReplies(): Promise<void> {
    const defaultQuickReplies: CreateQuickReplyDTO[] = [
        // Pour les clients
        {
            title: '🎫 Réserver un voyage',
            action_type: 'create_booking',
            payload: { action: 'open_booking_form' },
            icon: 'ticket',
            color: '#4CAF50',
            display_order: 1,
            requires_auth: false,
            user_role: 'customer',
            created_by: 1,
        },
        {
            title: '🔍 Voir les trajets',
            action_type: 'view_trips',
            payload: { action: 'list_trips' },
            icon: 'route',
            color: '#2196F3',
            display_order: 2,
            requires_auth: false,
            user_role: 'customer',
            created_by: 1,
        },
        {
            title: '📋 Vérifier ma réservation',
            action_type: 'check_status',
            payload: { action: 'check_booking_status' },
            icon: 'search',
            color: '#FF9800',
            display_order: 3,
            requires_auth: true,
            user_role: 'customer',
            created_by: 1,
        },
        {
            title: '❌ Annuler une réservation',
            action_type: 'cancel_booking',
            payload: { action: 'cancel_booking_form' },
            icon: 'cancel',
            color: '#F44336',
            display_order: 4,
            requires_auth: true,
            user_role: 'customer',
            created_by: 1,
        },
        {
            title: '💬 Contacter le support',
            action_type: 'contact_support',
            payload: { action: 'contact_human_support' },
            icon: 'support_agent',
            color: '#9C27B0',
            display_order: 5,
            requires_auth: false,
            user_role: 'customer',
            created_by: 1,
        },

        // Pour les admins
        {
            title: '✅ Confirmer',
            action_type: 'custom',
            payload: { action: 'confirm_action' },
            icon: 'check_circle',
            color: '#4CAF50',
            display_order: 1,
            requires_auth: false,
            user_role: 'admin',
            created_by: 1,
        },
        {
            title: '📝 Créer une réservation',
            action_type: 'create_booking',
            payload: { action: 'admin_create_booking' },
            icon: 'add_circle',
            color: '#2196F3',
            display_order: 2,
            requires_auth: false,
            user_role: 'admin',
            created_by: 1,
        },
        {
            title: '⏰ Rappeler plus tard',
            action_type: 'custom',
            payload: { action: 'snooze_conversation' },
            icon: 'schedule',
            color: '#FF9800',
            display_order: 3,
            requires_auth: false,
            user_role: 'admin',
            created_by: 1,
        },
    ];

    for (const quickReply of defaultQuickReplies) {
        try {
            await ChatRepository.createQuickReply(quickReply);
            console.log(`  ✓ Quick reply créé: ${quickReply.title}`);
        } catch (error) {
            console.error(`  ✗ Erreur création quick reply "${quickReply.title}":`, error);
        }
    }

    console.log(`✅ ${defaultQuickReplies.length} Quick replies créés`);
}

/**
 * Créer les réponses IA par défaut
 */
async function createDefaultAIResponses(): Promise<void> {
    const defaultAIResponses: CreateAIResponseDTO[] = [
        // ========================================
        // RÉPONSES EN ANGLAIS (par défaut)
        // ========================================

        // Greetings - English
        {
            intent: 'greeting',
            keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
            response_template: 'Hello {{sender_name}}! 👋 Welcome to Adigo. How can I help you today?',
            response_type: 'quick_replies',
            language: 'en',
            quick_reply_ids: [],
            priority: 10,
            confidence_threshold: 0.7,
            trigger_on_first_message: true,
            created_by: 1,
        },

        // Booking - English
        {
            intent: 'booking',
            keywords: ['book', 'booking', 'reservation', 'reserve', 'travel', 'trip', 'journey', 'seat', 'ticket'],
            response_template: 'I can help you book your trip! 🚌 Which destination would you like to travel to and on what date?',
            response_type: 'quick_replies',
            language: 'en',
            quick_reply_ids: [],
            priority: 9,
            confidence_threshold: 0.75,
            created_by: 1,
        },

        // Help - English
        {
            intent: 'help',
            keywords: ['help', 'assist', 'how', 'question', 'problem', 'issue', "don't understand", 'explain'],
            response_template: 'I\'m here to help! 💁 What would you like to do?\n\n• Book a trip\n• Check a booking\n• Cancel a booking\n• Other question',
            response_type: 'quick_replies',
            language: 'en',
            quick_reply_ids: [],
            priority: 8,
            confidence_threshold: 0.7,
            created_by: 1,
        },

        // Complaint - English
        {
            intent: 'complaint',
            keywords: ['complaint', 'dissatisfied', 'unhappy', 'disappointed', 'bad', 'terrible', 'awful'],
            response_template: 'I\'m sorry to hear you\'re experiencing an issue. 😔 A support agent will handle your request immediately.',
            response_type: 'text',
            language: 'en',
            priority: 10,
            confidence_threshold: 0.65,
            created_by: 1,
        },

        // Payment - English
        {
            intent: 'payment',
            keywords: ['pay', 'payment', 'paid', 'money', 'price', 'cost', 'rate', 'amount', 'fee'],
            response_template: 'For payment inquiries, our payment methods are:\n\n💰 Cash\n📱 Mobile Money (MTN & Orange)\n\nYou can pay directly when booking.',
            response_type: 'text',
            language: 'en',
            priority: 7,
            confidence_threshold: 0.7,
            created_by: 1,
        },

        // Cancel - English
        {
            intent: 'cancel',
            keywords: ['cancel', 'cancellation', 'delete', 'remove', 'refund'],
            response_template: 'To cancel your booking, I need your booking reference (e.g., BKG-2025-001234). Can you provide it?',
            response_type: 'quick_replies',
            language: 'en',
            quick_reply_ids: [],
            priority: 8,
            confidence_threshold: 0.75,
            created_by: 1,
        },

        // Feedback - English
        {
            intent: 'feedback',
            keywords: ['thank', 'thanks', 'great', 'excellent', 'good', 'perfect', 'awesome', 'wonderful'],
            response_template: 'Thank you so much! 😊 It\'s a pleasure to serve you. Don\'t hesitate if you need anything else!',
            response_type: 'text',
            language: 'en',
            priority: 5,
            confidence_threshold: 0.8,
            created_by: 1,
        },

        // Question - English
        {
            intent: 'question',
            keywords: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'how much'],
            response_template: 'I will forward your question to a support agent who can answer in detail. ⏳',
            response_type: 'quick_replies',
            language: 'en',
            quick_reply_ids: [],
            priority: 6,
            confidence_threshold: 0.6,
            created_by: 1,
        },

        // Unknown - English
        {
            intent: 'unknown',
            keywords: [],
            response_template: 'I didn\'t quite understand your request. 🤔 A support agent will contact you shortly!',
            response_type: 'quick_replies',
            language: 'en',
            quick_reply_ids: [],
            priority: 1,
            confidence_threshold: 0.3,
            created_by: 1,
        },

        // ========================================
        // RÉPONSES EN FRANÇAIS
        // ========================================

        // Salutations - Français
        {
            intent: 'greeting',
            keywords: ['bonjour', 'salut', 'bonsoir', 'bonne journée', 'coucou'],
            response_template: 'Bonjour {{sender_name}}! 👋 Bienvenue chez Adigo. Comment puis-je vous aider aujourd\'hui?',
            response_type: 'quick_replies',
            language: 'fr',
            quick_reply_ids: [],
            priority: 10,
            confidence_threshold: 0.7,
            trigger_on_first_message: true,
            created_by: 1,
        },

        // Réservation - Français
        {
            intent: 'booking',
            keywords: ['réserver', 'réservation', 'voyage', 'ticket', 'billet', 'trajet', 'bus', 'place', 'siège'],
            response_template: 'Je peux vous aider à réserver votre voyage! 🚌 Pour quelle destination souhaitez-vous voyager et à quelle date?',
            response_type: 'quick_replies',
            language: 'fr',
            quick_reply_ids: [],
            priority: 9,
            confidence_threshold: 0.75,
            created_by: 1,
        },

        // Aide - Français
        {
            intent: 'help',
            keywords: ['aide', 'aider', 'comment', 'question', 'problème', 'difficulté', 'comprend pas', 'expliquer'],
            response_template: 'Je suis là pour vous aider! 💁 Que souhaitez-vous faire?\n\n• Réserver un voyage\n• Vérifier une réservation\n• Annuler une réservation\n• Autre question',
            response_type: 'quick_replies',
            language: 'fr',
            quick_reply_ids: [],
            priority: 8,
            confidence_threshold: 0.7,
            created_by: 1,
        },

        // Plainte - Français
        {
            intent: 'complaint',
            keywords: ['plainte', 'mécontente', 'insatisfait', 'déçu', 'mauvais', 'nul', 'arnaque'],
            response_template: 'Je suis désolé d\'apprendre que vous rencontrez un problème. 😔 Un conseiller va prendre en charge votre demande immédiatement.',
            response_type: 'text',
            language: 'fr',
            priority: 10,
            confidence_threshold: 0.65,
            created_by: 1,
        },

        // Paiement - Français
        {
            intent: 'payment',
            keywords: ['payer', 'paiement', 'payé', 'argent', 'prix', 'coût', 'tarif', 'montant'],
            response_template: 'Pour les questions de paiement, nos moyens de paiement sont:\n\n💰 Espèces\n📱 Mobile Money (MTN & Orange)\n\nVous pouvez régler directement lors de la réservation.',
            response_type: 'text',
            language: 'fr',
            priority: 7,
            confidence_threshold: 0.7,
            created_by: 1,
        },

        // Annulation - Français
        {
            intent: 'cancel',
            keywords: ['annuler', 'annulation', 'supprimer', 'retirer', 'rembourser'],
            response_template: 'Pour annuler votre réservation, j\'ai besoin de votre référence de réservation (ex: BKG-2025-001234). Pouvez-vous me la communiquer?',
            response_type: 'quick_replies',
            language: 'fr',
            quick_reply_ids: [],
            priority: 8,
            confidence_threshold: 0.75,
            created_by: 1,
        },

        // Remerciement - Français
        {
            intent: 'feedback',
            keywords: ['merci', 'super', 'excellent', 'bien', 'parfait', 'génial', 'content', 'satisfait'],
            response_template: 'Merci beaucoup! 😊 C\'est un plaisir de vous servir. N\'hésitez pas si vous avez besoin d\'autre chose!',
            response_type: 'text',
            language: 'fr',
            priority: 5,
            confidence_threshold: 0.8,
            created_by: 1,
        },

        // Question - Français
        {
            intent: 'question',
            keywords: ['quoi', 'comment', 'pourquoi', 'quand', 'où', 'qui', 'combien'],
            response_template: 'Je vais transférer votre question à un conseiller qui pourra vous répondre de manière détaillée. ⏳',
            response_type: 'quick_replies',
            language: 'fr',
            quick_reply_ids: [],
            priority: 6,
            confidence_threshold: 0.6,
            created_by: 1,
        },

        // Inconnu - Français
        {
            intent: 'unknown',
            keywords: [],
            response_template: 'Je n\'ai pas bien compris votre demande. 🤔 Un conseiller va prendre contact avec vous rapidement!',
            response_type: 'quick_replies',
            language: 'fr',
            quick_reply_ids: [],
            priority: 1,
            confidence_threshold: 0.3,
            created_by: 1,
        },
    ];

    for (const aiResponse of defaultAIResponses) {
        try {
            await ChatRepository.createAIResponse(aiResponse);
            console.log(`  ✓ Réponse IA créée: ${aiResponse.intent}`);
        } catch (error) {
            console.error(`  ✗ Erreur création réponse IA "${aiResponse.intent}":`, error);
        }
    }

    console.log(`✅ ${defaultAIResponses.length} Réponses IA créées`);
}
