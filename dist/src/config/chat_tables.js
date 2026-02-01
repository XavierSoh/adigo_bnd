"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatTables = exports.kAIResponses = exports.kQuickReplies = exports.kMessages = exports.kConversations = void 0;
exports.createChatDatabaseIfNotExists = createChatDatabaseIfNotExists;
exports.default = createChatTables;
const pgdb_1 = __importDefault(require("./pgdb"));
const pg_promise_1 = __importDefault(require("pg-promise"));
/**
 * Tables pour le système de messagerie en temps réel
 *
 * Structure:
 * - conversations: Contient les conversations entre clients et admins
 * - messages: Contient tous les messages échangés
 * - quick_replies: Boutons d'action rapide
 * - ai_responses: Réponses automatiques de l'IA
 */
exports.kConversations = "conversations";
exports.kMessages = "messages";
exports.kQuickReplies = "quick_replies";
exports.kAIResponses = "ai_responses";
/**
 * Créer la base de données si elle n'existe pas
 * Note: Cette fonction nécessite une connexion à la base 'postgres'
 */
async function createChatDatabaseIfNotExists(dbName) {
    const pgpInstance = (0, pg_promise_1.default)();
    // Connexion à la base postgres par défaut pour créer d'autres bases
    const db = pgpInstance({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres', // Connexion à la base par défaut
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    });
    try {
        // Vérifier si la base existe
        const exists = await db.oneOrNone('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (!exists) {
            // Créer la base de données si elle n'existe pas
            await db.none(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Base de données "${dbName}" créée avec succès`);
        }
        else {
            console.log(`ℹ️  Base de données "${dbName}" existe déjà`);
        }
    }
    catch (error) {
        console.error(`❌ Erreur lors de la création de la base de données "${dbName}":`, error);
        // Ne pas propager l'erreur si la base existe déjà
    }
    finally {
        await db.$pool.end();
    }
}
exports.chatTables = [
    // Table des conversations
    {
        query: `CREATE TABLE IF NOT EXISTS ${exports.kConversations} (
            id SERIAL PRIMARY KEY,

            -- Participants
            customer_id INT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
            assigned_to INT REFERENCES "users"(id) ON DELETE SET NULL, -- Admin assigné

            -- Statut
            status VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'pending', 'closed', 'archived')),
            priority VARCHAR(20) DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

            -- Métadonnées
            subject VARCHAR(255),
            tags VARCHAR(100)[], -- Tags pour catégorisation: ['support', 'booking', 'payment', etc.]

            -- Métriques
            unread_count_customer INT DEFAULT 0, -- Messages non lus par le client
            unread_count_admin INT DEFAULT 0,    -- Messages non lus par l'admin
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_preview TEXT,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMP,

            -- Soft delete
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES "users"(id)
        );`
    },
    // Index pour conversations
    {
        query: `CREATE INDEX IF NOT EXISTS idx_conversations_customer
                ON ${exports.kConversations}(customer_id) WHERE is_deleted = FALSE;`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_conversations_assigned
                ON ${exports.kConversations}(assigned_to) WHERE is_deleted = FALSE;`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_conversations_status
                ON ${exports.kConversations}(status) WHERE is_deleted = FALSE;`
    },
    // Table des messages
    {
        query: `CREATE TABLE IF NOT EXISTS ${exports.kMessages} (
            id SERIAL PRIMARY KEY,
            conversation_id INT NOT NULL REFERENCES ${exports.kConversations}(id) ON DELETE CASCADE,

            -- Expéditeur
            sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system', 'ai')),
            sender_id INT, -- ID du customer ou de l'admin
            sender_name VARCHAR(100),

            -- Contenu
            message_type VARCHAR(20) NOT NULL DEFAULT 'text'
                CHECK (message_type IN ('text', 'image', 'file', 'location', 'booking_proposal', 'quick_reply', 'system')),
            content TEXT NOT NULL,

            -- Métadonnées pour différents types de messages
            metadata JSONB, -- Stocke des données additionnelles selon le type
            /*
            Exemples de metadata:
            - Pour 'booking_proposal': {trip_id, seats, price, expires_at}
            - Pour 'image': {url, thumbnail_url, width, height}
            - Pour 'file': {url, filename, size, mime_type}
            - Pour 'location': {latitude, longitude, address}
            - Pour 'quick_reply': {action, label, payload}
            */

            -- Statut
            is_read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMP,

            -- Réaction AI
            ai_processed BOOLEAN DEFAULT FALSE, -- Si l'IA a traité ce message
            ai_suggested_response TEXT,         -- Réponse suggérée par l'IA
            ai_confidence DECIMAL(3,2),         -- Score de confiance (0.00 - 1.00)
            ai_intent VARCHAR(50),              -- Intent détecté: 'booking', 'support', 'complaint', etc.

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            -- Soft delete
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMP
        );`
    },
    // Index pour messages
    {
        query: `CREATE INDEX IF NOT EXISTS idx_messages_conversation
                ON ${exports.kMessages}(conversation_id) WHERE is_deleted = FALSE;`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_messages_created
                ON ${exports.kMessages}(created_at DESC);`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_messages_ai_intent
                ON ${exports.kMessages}(ai_intent) WHERE ai_processed = TRUE;`
    },
    // Table des boutons d'action rapide (Quick Replies)
    {
        query: `CREATE TABLE IF NOT EXISTS ${exports.kQuickReplies} (
            id SERIAL PRIMARY KEY,

            -- Configuration
            title VARCHAR(100) NOT NULL,
            action_type VARCHAR(50) NOT NULL
                CHECK (action_type IN ('create_booking', 'check_status', 'view_trips', 'contact_support', 'cancel_booking', 'custom')),

            -- Payload (données à envoyer lors du clic)
            payload JSONB NOT NULL,
            /*
            Exemples de payload:
            - create_booking: {suggested_trip_id, from, to, date}
            - check_status: {booking_reference}
            - view_trips: {from, to, date_range}
            */

            -- Affichage
            icon VARCHAR(50), -- Nom de l'icône
            color VARCHAR(20), -- Couleur du bouton
            display_order INT DEFAULT 0,

            -- Conditions d'affichage
            requires_auth BOOLEAN DEFAULT FALSE,
            user_role VARCHAR(20), -- 'customer', 'admin', null = tous

            -- Statut
            is_active BOOLEAN DEFAULT TRUE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INT REFERENCES "users"(id)
        );`
    },
    // Table des réponses automatiques de l'IA
    {
        query: `CREATE TABLE IF NOT EXISTS ${exports.kAIResponses} (
            id SERIAL PRIMARY KEY,

            -- Pattern de détection
            intent VARCHAR(50) NOT NULL, -- 'booking', 'greeting', 'help', 'complaint', etc.
            keywords VARCHAR(100)[], -- Mots-clés pour détecter l'intent
            pattern TEXT, -- Regex optionnel pour matching avancé

            -- Réponse
            response_template TEXT NOT NULL, -- Template avec variables: "Bonjour {{name}}, comment puis-je vous aider?"
            response_type VARCHAR(20) DEFAULT 'text'
                CHECK (response_type IN ('text', 'quick_replies', 'booking_form')),
            language VARCHAR(2) DEFAULT 'en' NOT NULL
                CHECK (language IN ('fr', 'en')), -- Langue de la réponse: français ou anglais (par défaut: anglais)

            -- Quick replies associées (si response_type = 'quick_replies')
            quick_reply_ids INT[], -- IDs des quick_replies à afficher

            -- Priorité et activation
            priority INT DEFAULT 0, -- Plus élevé = plus prioritaire
            confidence_threshold DECIMAL(3,2) DEFAULT 0.70, -- Score min pour déclencher (0.00 - 1.00)
            is_active BOOLEAN DEFAULT TRUE,

            -- Conditions
            trigger_on_first_message BOOLEAN DEFAULT FALSE, -- S'active sur le 1er message uniquement
            max_uses_per_conversation INT, -- Limite d'utilisation par conversation (null = illimité)

            -- Statistiques
            usage_count INT DEFAULT 0,
            success_rate DECIMAL(5,2), -- % de fois où la réponse a été utile

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INT REFERENCES "users"(id)
        );`
    },
    // Index pour AI responses
    {
        query: `CREATE INDEX IF NOT EXISTS idx_ai_responses_intent
                ON ${exports.kAIResponses}(intent) WHERE is_active = TRUE;`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_ai_responses_priority
                ON ${exports.kAIResponses}(priority DESC) WHERE is_active = TRUE;`
    }
];
/**
 * Initialise les tables du chat
 */
async function createChatTables() {
    try {
        for (const table of exports.chatTables) {
            await pgdb_1.default.none(table.query);
        }
        console.log('✅ Tables de chat créées avec succès');
    }
    catch (error) {
        console.error('❌ Erreur lors de la création des tables de chat:', error);
        throw error;
    }
}
