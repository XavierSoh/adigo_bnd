// tripGeneration.controller.ts
// Migrated to Prisma's native model API — logic lives in
// GeneratedTripRepository, see BOOKING_MODULE_NOTES.md ("Full Prisma
// relational-API migration", tier 4).
import { Request, Response } from 'express';
import { TripGenerationService } from '../services/tripGeneration.service';
import { GeneratedTripRepository } from '../repository/generated-trip.repository';

// PRE-EXISTING BUG FOUND AND FIXED (unrelated to this conversion, flagged
// per the "signaler chaque écart" rule): `new TripGenerationService()` was
// declared BEFORE its own `import` statement in the original file.
// TypeScript's CommonJS output preserves statement order for top-level
// code, so evaluating this module standalone throws "Cannot access
// 'tripGeneration_service_1' before initialization" immediately — this
// file has zero live importers (confirmed dead/unmounted, see
// BOOKING_MODULE_NOTES.md), so the crash was never actually exercised in
// production, only surfaced now while directly testing this conversion.
const generationService = new TripGenerationService();


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

            const trips = await GeneratedTripRepository.findWithDriverDetailsByDateRange(
                new Date(startDate as string),
                new Date(endDate as string)
            );

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