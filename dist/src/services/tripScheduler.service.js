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
exports.TripSchedulerService = void 0;
// tripScheduler.service.ts
const node_cron_1 = __importDefault(require("node-cron"));
const tripGeneration_service_1 = require("./tripGeneration.service");
const pgdb_1 = __importDefault(require("../config/pgdb"));
const tbl = __importStar(require("../utils/table_names"));
class TripSchedulerService {
    constructor() {
        this.generationService = new tripGeneration_service_1.TripGenerationService();
    }
    /**
     * Planifie la génération automatique des voyages
     */
    startScheduling() {
        // Générer les voyages pour les 7 prochains jours à minuit chaque jour
        node_cron_1.default.schedule('22 16 * * *', async () => {
            try {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // 7 jours à l'avance
                console.log(`Génération automatique des voyages pour ${startDate} à ${endDate}`);
                await this.generationService.generateTripsForPeriod(startDate, endDate, 1); // 1 = système
            }
            catch (error) {
                console.error('Erreur dans la génération automatique:', error);
            }
        });
        // Nettoyer les voyages passés une fois par semaine
        node_cron_1.default.schedule('0 2 * * 0', async () => {
            await this.cleanupPastTrips();
        });
    }
    /**
     * Nettoie les voyages passés
     */
    async cleanupPastTrips() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        await pgdb_1.default.none(`
            DELETE FROM ${tbl.kGeneratedTrip} 
            WHERE actual_departure_time < $1
            AND status IN ('completed', 'cancelled')
        `, [oneWeekAgo]);
    }
}
exports.TripSchedulerService = TripSchedulerService;
