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
exports.initializeApp = initializeApp;
// src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const dbInit = __importStar(require("./config/init_db"));
const language_middleware_1 = require("./middleware/language.middleware");
// Routers
const users_router_1 = __importDefault(require("./routes/users.router"));
const staff_router_1 = __importDefault(require("./routes/staff.router"));
const access_rights_router_1 = __importDefault(require("./routes/access_rights.router"));
const contract_type_router_1 = __importDefault(require("./routes/contract_type.router"));
const profile_router_1 = __importDefault(require("./routes/profile.router"));
const agency_router_1 = __importDefault(require("./routes/agency.router"));
const bus_router_1 = __importDefault(require("./routes/bus.router"));
const trip_router_1 = __importDefault(require("./routes/trip.router"));
const seat_router_1 = __importDefault(require("./routes/seat.router"));
const booking_router_1 = __importDefault(require("./routes/booking.router"));
const generated_trip_router_1 = __importDefault(require("./routes/generated-trip.router"));
const customer_router_1 = __importDefault(require("./routes/customer.router"));
const generated_trip_seat_router_1 = __importDefault(require("./routes/generated_trip_seat.router"));
const chat_router_1 = __importDefault(require("./routes/chat.router"));
const wallet_router_1 = __importDefault(require("./routes/wallet.router"));
const tier_router_1 = __importDefault(require("./routes/tier.router"));
const company_settings_router_1 = __importDefault(require("./routes/company-settings.router"));
const dashboard_router_1 = __importDefault(require("./routes/dashboard.router"));
const ticketing_1 = __importDefault(require("./routes/ticketing"));
const vtc_router_1 = __importDefault(require("./routes/vtc.router"));
const food_router_1 = __importDefault(require("./routes/food.router"));
const parcel_router_1 = __importDefault(require("./routes/parcel.router"));
const app = (0, express_1.default)();
// Middlewares
app.use(express_1.default.json({ limit: "100mb" }));
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Language detection middleware (doit être après express.json())
app.use(language_middleware_1.languageMiddleware);
// Routes
app.use('/v1/api/users', users_router_1.default);
app.use('/v1/api/staff', staff_router_1.default);
app.use('/v1/api/contracts-types', contract_type_router_1.default);
app.use('/v1/api/access_rights', access_rights_router_1.default);
app.use('/v1/api/profiles', profile_router_1.default);
app.use('/v1/api/agency', agency_router_1.default);
app.use('/v1/api/bus', bus_router_1.default);
app.use('/v1/api/trip', trip_router_1.default);
app.use('/v1/api/generated_trip', generated_trip_router_1.default);
app.use('/v1/api/seat', seat_router_1.default);
app.use('/v1/api/booking', booking_router_1.default);
app.use('/v1/api/customers', customer_router_1.default);
app.use('/v1/api/generated_trip_seats', generated_trip_seat_router_1.default);
app.use('/v1/api/chat', chat_router_1.default);
app.use('/v1/api/wallet', wallet_router_1.default);
app.use('/v1/api/tier', tier_router_1.default);
app.use('/v1/api/company-settings', company_settings_router_1.default);
app.use('/v1/api/dashboard', dashboard_router_1.default);
// Ticketing Module
app.use('/v1/api/ticketing', ticketing_1.default);
// VTC Module
app.use('/v1/api/vtc', vtc_router_1.default);
// Food Delivery Module
app.use('/v1/api/food', food_router_1.default);
// Parcel Delivery Module
app.use('/v1/api/parcel', parcel_router_1.default);
// ✅ Initialiser la base de données de manière asynchrone
async function initializeApp() {
    try {
        console.log('🚀 Démarrage de l\'initialisation...');
        await dbInit.initDb();
        console.log('✅ Base de données initialisée avec succès');
        return app;
    }
    catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la DB:', error);
        throw error;
    }
}
// Lancer l'initialisation immédiatement
initializeApp().catch(err => {
    console.error('💥 Erreur fatale lors du démarrage:', err);
    process.exit(1); // Arrêter l'application si l'init échoue
});
exports.default = app;
