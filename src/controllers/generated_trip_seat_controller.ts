// ============================================
// CONTROLLER - generated-trip-seat.controller.ts
// ============================================
import { Request, Response } from "express";  
import { GeneratedTripSeatRepository } from "../repository/generated_trip_seat_repository";

export class GeneratedTripSeatController {

    // Get seat by ID
    static async getById(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripSeatRepository.findById(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get all seats for a generated trip
    static async getByGeneratedTrip(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripSeatRepository.findByGeneratedTrip(generatedTripId);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get seats by status (available, reserved, booked, blocked)
    static async getByStatus(req: Request, res: Response): Promise<void> {
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
            if (!validStatuses.includes(status as string)) {
                res.status(400).json({
                    status: false,
                    message: "Statut invalide",
                    code: 400
                });
                return;
            }

            const result = await GeneratedTripSeatRepository.findByStatus(generatedTripId, status as string);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Count available seats for a generated trip
    static async countAvailable(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripSeatRepository.countAvailable(generatedTripId);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get seats with seat details (join with seat table)
    static async getWithDetails(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripSeatRepository.findWithDetails(generatedTripId);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
}
