// tripGeneration.controller.ts
import { Request, Response } from 'express'; 
const generationService = new TripGenerationService();
import * as tbl from "../utils/table_names";
import pgpDb from '../config/pgdb';
import { TripGenerationService } from '../services/tripGeneration.service';


export const tripGenerationController = {
    /**
     * Génère les voyages pour une période spécifique
     */
    generateTrips: async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, regenerate = false, userId } = req.body;
               
            if (regenerate) {
                await generationService.cleanupGeneratedTrips(
                    new Date(startDate), 
                    new Date(endDate)
                );
            }
            
            const count = await generationService.generateTripsForPeriod(
                new Date(startDate), 
                new Date(endDate), 
                userId
            );
            
            res.json({
                success: true,
                message: `${count} voyages générés avec succès`,
                count
            });
            
        } catch (error) {
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
    getGeneratedTrips: async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;
            
            const trips = await pgpDb.any(`
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
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des voyages',
                error: error.message
            });
        }
    }
};