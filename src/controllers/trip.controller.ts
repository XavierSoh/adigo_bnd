
import { Request, Response } from 'express';
import { TripModel } from '../models/trip.model';
import { TripRepository } from '../repository/trip.repository';
import { TripGenerationService } from '../services/tripGeneration.service';

export class TripController {
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const tripData: TripModel = {
                departure_city: req.body.departure_city,
                arrival_city: req.body.arrival_city,
                departure_time: new Date(req.body.departure_time),
                arrival_time: new Date(req.body.arrival_time),
                price: parseFloat(req.body.price),
                bus_id: parseInt(req.body.bus_id),
                agency_id: parseInt(req.body.agency_id),
                is_active: req.body.is_active ?? true,
                cancellation_policy: req.body.cancellation_policy,
                is_deleted: false,
                recurrence_pattern: req.body.recurrence_pattern ? {
                    type: req.body.recurrence_pattern.type,
                    interval: parseInt(req.body.recurrence_pattern.interval),
                    days_of_week: req.body.recurrence_pattern.days_of_week,
                    end_date: req.body.recurrence_pattern.end_date ? new Date(req.body.recurrence_pattern.end_date) : undefined,
                    exceptions: req.body.recurrence_pattern.exceptions?.map((date: string) => new Date(date))
                } : undefined,
                valid_from: new Date(req.body.valid_from),
                valid_until: req.body.valid_until ? new Date(req.body.valid_until) : undefined,
                created_by: req.body.created_by
            };

            // Basic validation
            if (!tripData.departure_city || !tripData.arrival_city) {
                res.status(400).json({
                    status: false,
                    message: 'Ville de départ et d\'arrivée requises',
                    code: 400
                });
                return;
            }

            if (tripData.departure_time >= tripData.arrival_time) {
                res.status(400).json({
                    status: false,
                    message: 'L\'heure d\'arrivée doit être après l\'heure de départ',
                    code: 400
                });
                return;
            }

            if (tripData.price <= 0) {
                res.status(400).json({
                    status: false,
                    message: 'Le prix doit être positif',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.create(tripData);

            // Appel automatique à la génération des voyages sur 30 jours à partir de valid_from
            if (result.status && result.body && (result.body as any).id) {
                try {
                    const tripId = (result.body as any).id;
                    const validFrom = tripData.valid_from;
                    const validUntil = tripData.valid_until || new Date(validFrom.getTime() + 29 * 24 * 60 * 60 * 1000);
                    const userId = tripData.created_by;
                    const tripGenService = new TripGenerationService();
                    // Génère uniquement pour ce trip (optimisation possible si besoin)
                    await tripGenService.generateTripsForPeriod(validFrom, validUntil, userId);
                } catch (err) {
                    // Log mais ne bloque pas la création du trip
                    console.error('Erreur lors de la génération automatique des voyages:', err);
                }
            }
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: 'ID invalide',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.findById(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: 'ID invalide',
                    code: 400
                });
                return;
            }

            const updateData: Partial<TripModel> = {};

            // Only update fields that are provided
            if (req.body.departure_city !== undefined) updateData.departure_city = req.body.departure_city;
            if (req.body.arrival_city !== undefined) updateData.arrival_city = req.body.arrival_city;
            if (req.body.departure_time !== undefined) updateData.departure_time = new Date(req.body.departure_time);
            if (req.body.arrival_time !== undefined) updateData.arrival_time = new Date(req.body.arrival_time);
            if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
            if (req.body.bus_id !== undefined) updateData.bus_id = parseInt(req.body.bus_id);
            if (req.body.agency_id !== undefined) updateData.agency_id = parseInt(req.body.agency_id);
            if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
            if (req.body.cancellation_policy !== undefined) updateData.cancellation_policy = req.body.cancellation_policy;
            if (req.body.valid_from !== undefined) updateData.valid_from = new Date(req.body.valid_from);
            if (req.body.valid_until !== undefined) updateData.valid_until = new Date(req.body.valid_until);

            if (req.body.recurrence_pattern !== undefined) {
                updateData.recurrence_pattern = req.body.recurrence_pattern ? {
                    type: req.body.recurrence_pattern.type,
                    interval: parseInt(req.body.recurrence_pattern.interval),
                    days_of_week: req.body.recurrence_pattern.days_of_week,
                    end_date: req.body.recurrence_pattern.end_date ? new Date(req.body.recurrence_pattern.end_date) : undefined,
                    exceptions: req.body.recurrence_pattern.exceptions?.map((date: string) => new Date(date))
                } : undefined;
            }

            // Validation for departure/arrival times if both are being updated
            if (updateData.departure_time && updateData.arrival_time) {
                if (updateData.departure_time >= updateData.arrival_time) {
                    res.status(400).json({
                        status: false,
                        message: 'L\'heure d\'arrivée doit être après l\'heure de départ',
                        code: 400
                    });
                    return;
                }
            }

            // Validation for price
            if (updateData.price !== undefined && updateData.price <= 0) {
                res.status(400).json({
                    status: false,
                    message: 'Le prix doit être positif',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.update(id, updateData);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async softDelete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const deletedBy = parseInt(req.body.deleted_by);
            
            if (isNaN(id) || isNaN(deletedBy)) {
                res.status(400).json({
                    status: false,
                    message: 'ID ou deleted_by invalide',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.softDelete(id, deletedBy);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async restore(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: 'ID invalide',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.restore(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: 'ID invalide',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.delete(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async getByAgency(req: Request, res: Response): Promise<void> {
        try {
            const agencyId = parseInt(req.params.agencyId);
            const isDeleted = req.query.is_deleted === 'true';
            
            if (isNaN(agencyId)) {
                res.status(400).json({
                    status: false,
                    message: 'ID agence invalide',
                    code: 400
                });
                return;
            }

            const result = await TripRepository.findAllByAgency(agencyId, isDeleted);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }

    static async searchByRoute(req: Request, res: Response): Promise<void> {
        try {
            const { departure_city, arrival_city, departure_date } = req.query;

            if (!departure_city || !arrival_city) {
                res.status(400).json({
                    status: false,
                    message: 'Ville de départ et d\'arrivée requises',
                    code: 400
                });
                return;
            }

            let departureDate: Date | undefined;
            if (departure_date) {
                departureDate = new Date(departure_date as string);
                if (isNaN(departureDate.getTime())) {
                    res.status(400).json({
                        status: false,
                        message: 'Format de date invalide',
                        code: 400
                    });
                    return;
                }
            }

            const result = await TripRepository.findByRoute(
                departure_city as string,
                arrival_city as string,
                departureDate
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erreur interne du serveur',
                code: 500
            });
        }
    }
}