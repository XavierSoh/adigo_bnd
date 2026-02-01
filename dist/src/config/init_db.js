"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = void 0;
const create_tables_1 = __importDefault(require("./create_tables"));
const initFirtsItems_1 = __importDefault(require("./initFirtsItems"));
const chat_tables_1 = __importStar(require("./chat_tables"));
const migrate_customer_table_1 = require("./migrate_customer_table");
const migrate_booking_payment_method_1 = require("./migrate_booking_payment_method");
const migrate_booking_created_by_1 = require("./migrate_booking_created_by");
const initDb = async () => {
    // Créer la base de données si elle n'existe pas
    const dbName = process.env.DB_DATABASE || 'adigo_db';
    await (0, chat_tables_1.createChatDatabaseIfNotExists)(dbName);
    // Créer les tables
    await (0, create_tables_1.default)();
    await (0, chat_tables_1.default)();
    // Run migrations
    await (0, migrate_customer_table_1.migrateCustomerTable)();
    await (0, migrate_booking_payment_method_1.migrateBookingPaymentMethod)();
    await (0, migrate_booking_created_by_1.migrateBookingCreatedBy)();
    // Initialiser les données par défaut
    await (0, initFirtsItems_1.default)();
};
exports.initDb = initDb;
