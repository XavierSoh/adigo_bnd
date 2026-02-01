"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratedTripSeatController = void 0;
const generated_trip_seat_repository_1 = require("../repository/generated_trip_seat_repository");
class GeneratedTripSeatController {
    // Get seat by ID
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
            const result = await generated_trip_seat_repository_1.GeneratedTripSeatRepository.findById(id);
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
    // Get all seats for a generated trip
    static async getByGeneratedTrip(req, res) {
        try {
            const generatedTripId = parseInt(req.params.generated_trip_id);
            if (isNaN(generatedTripId)) {
                res.status(400).json({
                    status: false,
                    message: "generated_trip_id invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_seat_repository_1.GeneratedTripSeatRepository.findByGeneratedTrip(generatedTripId);
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
    // Get seats by status (available, reserved, booked, blocked)
    static async getByStatus(req, res) {
        try {
            const generatedTripId = parseInt(req.params.generated_trip_id);
            const { status } = req.query;
            if (isNaN(generatedTripId)) {
                res.status(400).json({
                    status: false,
                    message: "generated_trip_id invalide",
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
            const validStatuses = ['available', 'reserved', 'booked', 'blocked'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    status: false,
                    message: "Statut invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_seat_repository_1.GeneratedTripSeatRepository.findByStatus(generatedTripId, status);
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
    // Count available seats for a generated trip
    static async countAvailable(req, res) {
        try {
            const generatedTripId = parseInt(req.params.generated_trip_id);
            if (isNaN(generatedTripId)) {
                res.status(400).json({
                    status: false,
                    message: "generated_trip_id invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_seat_repository_1.GeneratedTripSeatRepository.countAvailable(generatedTripId);
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
    // Get seats with seat details (join with seat table)
    static async getWithDetails(req, res) {
        try {
            const generatedTripId = parseInt(req.params.generated_trip_id);
            if (isNaN(generatedTripId)) {
                res.status(400).json({
                    status: false,
                    message: "generated_trip_id invalide",
                    code: 400
                });
                return;
            }
            const result = await generated_trip_seat_repository_1.GeneratedTripSeatRepository.findWithDetails(generatedTripId);
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
exports.GeneratedTripSeatController = GeneratedTripSeatController;
