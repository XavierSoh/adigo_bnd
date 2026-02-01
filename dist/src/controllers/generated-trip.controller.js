"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratedTripController = void 0;
const generated_trip_repository_1 = require("../repository/generated-trip.repository");
const tripGeneration_service_1 = require("../services/tripGeneration.service");
class GeneratedTripController {
    // Create new generated trip
    static async create(req, res) {
        try {
            const generatedTrip = req.body;
            if (!generatedTrip.trip_id || !generatedTrip.original_departure_time ||
                !generatedTrip.actual_departure_time || generatedTrip.available_seats === undefined) {
                res.status(400).json({
                    status: false,
                    message: "trip_id, original_departure_time, actual_departure_time et available_seats sont requis",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.create(generatedTrip);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    static async generateForPeriod(req, res) {
        try {
            const { startDate, endDate } = req.body;
            // Helper pour gérer les dates par défaut
            const getDate = (dateStr, defaultDaysOffset = 0) => {
                if (dateStr) {
                    return new Date(dateStr);
                }
                const date = new Date();
                if (defaultDaysOffset !== 0) {
                    date.setDate(date.getDate() + defaultDaysOffset);
                }
                return date;
            };
            const start = getDate(startDate, 0);
            const end = getDate(endDate, 7); // 7 jours par défaut
            // Validation
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                res.status(400).json({
                    success: false,
                    error: 'Format de date invalide. Utilisez YYYY-MM-DD'
                });
                return;
            }
            if (end < start) {
                res.status(400).json({
                    success: false,
                    error: 'La date de fin doit être après la date de début'
                });
                return;
            }
            const service = new tripGeneration_service_1.TripGenerationService();
            const count = await service.generateTripsForPeriod(start, end, 1);
            res.json({
                success: true,
                message: `${count} voyage(s) généré(s)`,
                count,
                period: {
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0]
                }
            });
        }
        catch (error) {
            console.error('Erreur génération:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erreur lors de la génération'
            });
        }
    }
    // Get by ID
    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.findById(id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Get all with filters
    static async getAll(req, res) {
        try {
            const { trip_id, status, agency_id, with_details } = req.query;
            let result;
            if (with_details === 'true') {
                result = await generated_trip_repository_1.GeneratedTripRepository.findAllWithDetails(agency_id ? parseInt(agency_id) : undefined);
            }
            else if (trip_id) {
                result = await generated_trip_repository_1.GeneratedTripRepository.findByTrip(parseInt(trip_id));
            }
            else if (status) {
                result = await generated_trip_repository_1.GeneratedTripRepository.findByStatus(status);
            }
            else {
                result = await generated_trip_repository_1.GeneratedTripRepository.findAll();
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Update
    static async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            const generatedTrip = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.update(id, generatedTrip);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Delete
    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.delete(id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Get by date range
    static async getByDateRange(req, res) {
        try {
            const { start_date, end_date } = req.query;
            if (!start_date || !end_date) {
                res.status(400).json({
                    status: false,
                    message: "start_date et end_date sont requis",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.findByDateRange(new Date(start_date), new Date(end_date));
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Update status
    static async updateStatus(req, res) {
        try {
            const id = parseInt(req.params.id);
            const { status } = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }
            if (!status) {
                res.status(400).json({
                    status: false,
                    message: "status est requis",
                    code: 400
                });
                return;
            }
            const validStatuses = ['scheduled', 'boarding', 'departed', 'arrived', 'cancelled'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    status: false,
                    message: "Statut invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.updateStatus(id, status);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Assign staff
    static async assignStaff(req, res) {
        try {
            const id = parseInt(req.params.id);
            const { driver_id, conductor_id } = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.assignStaff(id, driver_id, conductor_id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Get statistics
    static async getStatistics(req, res) {
        try {
            const { agency_id } = req.query;
            const result = await generated_trip_repository_1.GeneratedTripRepository.getStatistics(agency_id ? parseInt(agency_id) : undefined);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Update available seats
    static async updateAvailableSeats(req, res) {
        try {
            const id = parseInt(req.params.id);
            const { available_seats } = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }
            if (available_seats === undefined) {
                res.status(400).json({
                    status: false,
                    message: "available_seats est requis",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_repository_1.GeneratedTripRepository.updateAvailableSeats(id, available_seats);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
    // Get available cities
    static async getAvailableCities(req, res) {
        try {
            const result = await generated_trip_repository_1.GeneratedTripRepository.getAvailableCities();
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
}
exports.GeneratedTripController = GeneratedTripController;
