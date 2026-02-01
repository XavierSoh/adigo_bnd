// tripScheduler.service.ts
import cron from 'node-cron';
import { TripGenerationService } from './tripGeneration.service';
import pgpDb from '../config/pgdb';
import * as tbl from "../utils/table_names";

export class TripSchedulerService {
    private generationService: TripGenerationService;
    
    constructor() {
        this.generationService = new TripGenerationService();
    }
    
    /**
     * Planifie la génération automatique des voyages
     */
    startScheduling(): void {
        // Générer les voyages pour les 7 prochains jours à minuit chaque jour
        cron.schedule('22 16 * * *', async () => {
            try {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // 7 jours à l'avance
                
                console.log(`Génération automatique des voyages pour ${startDate} à ${endDate}`);
                
                await this.generationService.generateTripsForPeriod(startDate, endDate, 1); // 1 = système
                
            } catch (error) {
                console.error('Erreur dans la génération automatique:', error);
            }
        });
        
        // Nettoyer les voyages passés une fois par semaine
        cron.schedule('0 2 * * 0', async () => { // Dimanche à 2h du matin
            await this.cleanupPastTrips();
        });
    }
    
    /**
     * Nettoie les voyages passés
     */
    private async cleanupPastTrips(): Promise<void> {

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); 
        await pgpDb.none(`
            DELETE FROM ${tbl.kGeneratedTrip} 
            WHERE actual_departure_time < $1
            AND status IN ('completed', 'cancelled')
        `, [oneWeekAgo]);
    }
}