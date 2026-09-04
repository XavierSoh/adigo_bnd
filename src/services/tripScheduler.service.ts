// tripScheduler.service.ts
// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 4).
import cron from 'node-cron';
import { TripGenerationService } from './tripGeneration.service';
import { BookingNotificationService } from './bookingNotification.service';
import prismaDb from '../config/prismaClient';

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

        // Rappels push "voyage dans X minutes" — vérifié chaque minute (le
        // délai par client, customer.reminder_minutes_before, est appliqué
        // en mémoire dans le service, pas ici). Voir
        // bookingNotification.service.ts / migrations/booking_push_notifications.sql.
        cron.schedule('* * * * *', async () => {
            try {
                await BookingNotificationService.sendDueTripReminders();
            } catch (error) {
                console.error('Erreur dans les rappels de voyage:', error);
            }
        });
    }
    
    /**
     * Nettoie les voyages passés
     */
    private async cleanupPastTrips(): Promise<void> {

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        await prismaDb.generated_trip.deleteMany({
            where: {
                actual_departure_time: { lt: oneWeekAgo },
                status: { in: ['completed', 'cancelled'] },
            },
        });
    }
}