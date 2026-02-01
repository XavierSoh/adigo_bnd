// 3. CONTROLLER - generated-trip.controller.ts
// ============================================
import { Request, Response } from "express"; 
import { GeneratedTripRepository } from "../repository/generated-trip.repository";
import { GeneratedTripModel } from "../models/generated_trip.model";
import { TripGenerationService } from "../services/tripGeneration.service";

export class GeneratedTripController {
    // Create new generated trip
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const generatedTrip: GeneratedTripModel = req.body;

            if (!generatedTrip.trip_id || !generatedTrip.original_departure_time || 
                !generatedTrip.actual_departure_time || generatedTrip.available_seats === undefined) {
                res.status(400).json({
                    status: false,
                    message: "trip_id, original_departure_time, actual_departure_time et available_seats sont requis",
                    code: 400
                });
                return;
            }

            const result = await GeneratedTripRepository.create(generatedTrip);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    static async generateForPeriod(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.body;
    
    // Helper pour gérer les dates par défaut
    const getDate = (dateStr: string | undefined, defaultDaysOffset: number = 0): Date => {
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
    
    const service = new TripGenerationService();
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
    
  } catch (error) {
    console.error('Erreur génération:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erreur lors de la génération'
    });
  }
}

    // Get by ID
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

            const result = await GeneratedTripRepository.findById(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get all with filters
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const { trip_id, status, agency_id, with_details } = req.query;
 
            let result;

            if (with_details === 'true') {
                result = await GeneratedTripRepository.findAllWithDetails(
                    agency_id ? parseInt(agency_id as string) : undefined
                );
            } else if (trip_id) {
                result = await GeneratedTripRepository.findByTrip(parseInt(trip_id as string));
            } else if (status) {
                result = await GeneratedTripRepository.findByStatus(status as string);
            } else {
                result = await GeneratedTripRepository.findAll();
            }

            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Update
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const generatedTrip: Partial<GeneratedTripModel> = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await GeneratedTripRepository.update(id, generatedTrip);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Delete
    static async delete(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripRepository.delete(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get by date range
    static async getByDateRange(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripRepository.findByDateRange(
                new Date(start_date as string),
                new Date(end_date as string)
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Update status
    static async updateStatus(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripRepository.updateStatus(id, status);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Assign staff
    static async assignStaff(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripRepository.assignStaff(id, driver_id, conductor_id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get statistics
    static async getStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { agency_id } = req.query;

            const result = await GeneratedTripRepository.getStatistics(
                agency_id ? parseInt(agency_id as string) : undefined
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Update available seats
    static async updateAvailableSeats(req: Request, res: Response): Promise<void> {
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

            const result = await GeneratedTripRepository.updateAvailableSeats(id, available_seats);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get available cities
    static async getAvailableCities(req: Request, res: Response): Promise<void> {
        try {
            const result = await GeneratedTripRepository.getAvailableCities();
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
