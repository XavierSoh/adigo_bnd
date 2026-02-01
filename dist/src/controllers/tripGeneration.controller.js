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
exports.tripGenerationController = void 0;
const generationService = new tripGeneration_service_1.TripGenerationService();
const tbl = __importStar(require("../utils/table_names"));
const pgdb_1 = __importDefault(require("../config/pgdb"));
const tripGeneration_service_1 = require("../services/tripGeneration.service");
exports.tripGenerationController = {
    /**
     * Génère les voyages pour une période spécifique
     */
    generateTrips: async (req, res) => {
        try {
            const { startDate, endDate, regenerate = false, userId } = req.body;
            if (regenerate) {
                await generationService.cleanupGeneratedTrips(new Date(startDate), new Date(endDate));
            }
            const count = await generationService.generateTripsForPeriod(new Date(startDate), new Date(endDate), userId);
            res.json({
                success: true,
                message: `${count} voyages générés avec succès`,
                count
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la génération des voyages',
                error: error.message
            });
        }
    },
    /**
     * Récupère les voyages générés pour une période
     */
    getGeneratedTrips: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const trips = await pgdb_1.default.any(`
                SELECT gt.*, t.departure_city, t.arrival_city, t.price,
                       b.registration_number, b.capacity,
                       CONCAT(s.first_name, ' ', s.last_name) as driver_name
                FROM ${tbl.kGeneratedTrip} gt
                JOIN ${tbl.kTrip} t ON gt.trip_id = t.id
                LEFT JOIN ${tbl.kBus} b ON gt.bus_id = b.id
                LEFT JOIN ${tbl.kStaff} s ON gt.driver_id = s.id
                WHERE gt.actual_departure_time >= $1 
                AND gt.actual_departure_time <= $2
                ORDER BY gt.actual_departure_time
            `, [startDate, endDate]);
            res.json({ success: true, trips });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des voyages',
                error: error.message
            });
        }
    }
};
