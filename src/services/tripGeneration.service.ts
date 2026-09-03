import { pgAny, pgOneOrNone, pgNone } from "../utils/prisma-compat";
import * as tbl from "../utils/table_names";

export class TripGenerationService {
    
    async generateTripsForPeriod(startDate: Date, endDate: Date, userId: number): Promise<number> {
        let generatedCount = 0;
        
        try {
            console.log(`📅 Génération du ${startDate.toISOString()} au ${endDate.toISOString()}`);
            
            // 1. Récupérer tous les trips avec récurrence
            const trips = await pgAny(`
                SELECT t.*, rp.type as recurrence_type, rp.interval, 
                       rp.days_of_week, rp.end_date as recurrence_end_date,
                       rp.exceptions
                FROM ${tbl.kTrip} t
                LEFT JOIN ${tbl.kRecurrencePattern} rp ON t.recurrence_pattern_id = rp.id
                WHERE t.is_active = true  
                AND t.is_deleted = false
                AND (t.valid_until IS NULL OR t.valid_until >= $1)
                AND t.valid_from <= $2
            `, [startDate, endDate]);   
             
            console.log(`📋 ${trips.length} trip(s) trouvé(s)`);
            
            // 2. Générer les voyages pour chaque trip
            for (const trip of trips) {
                console.log(`\n🚌 Trip ${trip.id} (${trip.departure_city} → ${trip.arrival_city})`);
                console.log(`   Type: ${trip.recurrence_type || 'none'}, Interval: ${trip.interval}`);
                
                const tripGenerated = await this.generateTripInstances(trip, startDate, endDate);
                generatedCount += tripGenerated;
                
                console.log(`   ✓ ${tripGenerated} instance(s) générée(s)`);
            }
            
            // 3. Logger la génération
            await this.logGeneration(startDate, endDate, generatedCount, userId);
            
            console.log(`\n✅ Total: ${generatedCount} voyage(s) généré(s)`);
            return generatedCount;
             
        } catch (error) {
            console.error('❌ Erreur lors de la génération des voyages:', error);
            throw error;
        }
    }
    
    private async generateTripInstances(trip: any, startDate: Date, endDate: Date): Promise<number> {
        let instancesGenerated = 0;
        const currentDate = new Date(startDate);
        
        // Compteur de sécurité pour éviter les boucles infinies
        let iterations = 0;
        const maxIterations = 1000;
        
        while (currentDate <= endDate && iterations < maxIterations) {
            iterations++;
            
            // Vérifier si la date est valide selon la récurrence
            if (this.isValidDateForTrip(trip, currentDate)) {
                console.log(`      → Génération pour ${currentDate.toISOString().split('T')[0]}`);
                await this.createTripInstance(trip, currentDate);
                instancesGenerated++;
            }
            
            // Passer à la date suivante
            this.incrementDate(trip, currentDate);
        }
        
        if (iterations >= maxIterations) {
            console.warn(`⚠️ Limite d'itérations atteinte pour le trip ${trip.id}`);
        }
        
        return instancesGenerated;
    }
    
    private isValidDateForTrip(trip: any, date: Date): boolean {
        // Vérifier que la date est dans la période de validité
        if (trip.valid_from) {
            const validFrom = new Date(trip.valid_from);
            validFrom.setHours(0, 0, 0, 0);
            if (date < validFrom) return false;
        }
        
        if (trip.valid_until) {
            const validUntil = new Date(trip.valid_until);
            validUntil.setHours(23, 59, 59, 999);
            if (date > validUntil) return false;
        }
        
        // Vérifier les exceptions
        if (this.isExceptionDate(trip, date)) {
            return false;
        }
        
        // Vérifier selon le type de récurrence
        switch (trip.recurrence_type) {
            case 'daily':
                return this.isValidDaily(trip, date);
                
            case 'weekly':
                return this.isValidWeekly(trip, date);
                
            case 'monthly':
                return this.isValidMonthly(trip, date);
                
            case 'none':
            case null:
            case undefined:
                // Voyage unique - vérifier si c'est la date originale
                const tripDate = new Date(trip.departure_time);
                tripDate.setHours(0, 0, 0, 0);
                const checkDate = new Date(date);
                checkDate.setHours(0, 0, 0, 0);
                return tripDate.getTime() === checkDate.getTime();
                
            default:
                console.warn(`⚠️ Type de récurrence inconnu: ${trip.recurrence_type}`);
                return false;
        }
    }
    
    private isValidDaily(trip: any, date: Date): boolean {
        // Pour daily, TOUS les jours sont valides (pas de vérification de days_of_week)
        // On ne vérifie que l'intervalle si défini
        const interval = trip.interval || 1;
        
        // Si interval = 1, tous les jours sont valides
        if (interval === 1) {
            return true;
        }
        
        // Si interval > 1, vérifier que c'est un multiple
        const startDate = trip.valid_from 
            ? new Date(trip.valid_from) 
            : new Date(trip.departure_time);
        
        startDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        
        return daysDiff >= 0 && daysDiff % interval === 0;
    }
    
    private isValidWeekly(trip: any, date: Date): boolean {
        if (!trip.days_of_week) {
            console.warn(`⚠️ days_of_week non défini pour le trip ${trip.id}`);
            return false;
        }
        
        try {
            const daysOfWeek = JSON.parse(trip.days_of_week);
            const dayOfWeek = date.getDay(); // 0=dimanche, 6=samedi
            return daysOfWeek.includes(dayOfWeek);
        } catch (error) {
            console.error(`❌ Erreur parsing days_of_week:`, error);
            return false;
        }
    }
    
    private isValidMonthly(trip: any, date: Date): boolean {
        const originalDate = new Date(trip.departure_time);
        return date.getDate() === originalDate.getDate();
    }
    
    private isExceptionDate(trip: any, date: Date): boolean {
        if (!trip.exceptions) return false;
        
        try {
            const exceptions = JSON.parse(trip.exceptions);
            const dateStr = date.toISOString().split('T')[0];
            return exceptions.includes(dateStr);
        } catch (error) {
            console.error(`❌ Erreur parsing exceptions:`, error);
            return false;
        }
    }
    
    private incrementDate(trip: any, date: Date): void {
        switch (trip.recurrence_type) {
            case 'daily':
                // Pour daily, incrémenter de l'intervalle spécifié
                const interval = trip.interval || 1;
                date.setDate(date.getDate() + interval);
                break;
                
            case 'weekly':
                // Pour weekly, toujours incrémenter de 1 jour
                // (on vérifie ensuite si c'est un jour valide)
                date.setDate(date.getDate() + 1);
                break;
                
            case 'monthly':
                const monthInterval = trip.interval || 1;
                date.setMonth(date.getMonth() + monthInterval);
                break;
                
            default:
                // Par défaut, incrémenter de 1 jour
                date.setDate(date.getDate() + 1);
        }
    }
    
    private async createTripInstance(trip: any, date: Date): Promise<void> {
        const originalDeparture = new Date(trip.departure_time);
        const originalArrival = new Date(trip.arrival_time);
        
        const departureTime = new Date(date);
        departureTime.setHours(originalDeparture.getHours(), originalDeparture.getMinutes(), 0, 0);
        
        const arrivalTime = new Date(date);
        arrivalTime.setHours(originalArrival.getHours(), originalArrival.getMinutes(), 0, 0);
        
        // Ajuster si le voyage passe minuit
        if (arrivalTime < departureTime) {
            arrivalTime.setDate(arrivalTime.getDate() + 1);
        }
        
        const busCapacity = await this.getBusCapacity(trip.bus_id);
          
        await pgNone(`
            INSERT INTO ${tbl.kGeneratedTrip}
            (trip_id, original_departure_time, actual_departure_time, 
             actual_arrival_time, available_seats, bus_id)
            VALUES ($1, $2, $3, $4, $5, $6) 
            ON CONFLICT (trip_id, actual_departure_time) DO NOTHING
        `, [trip.id, trip.departure_time, departureTime, arrivalTime, busCapacity, trip.bus_id]);
    }
    
    private async getBusCapacity(busId: number): Promise<number> {
        const bus = await pgOneOrNone(`
            SELECT capacity FROM ${tbl.kBus} WHERE id = $1 AND is_deleted = false
        `, [busId]);
        
        return bus?.capacity || 0;
    }
    
    private async logGeneration(startDate: Date, endDate: Date, count: number, userId: number): Promise<void> {
        await pgNone(`
            INSERT INTO ${tbl.kTripGenerationLog} 
            (generation_date, trips_generated, period_start, period_end, generated_by)
            VALUES (CURRENT_DATE, $1, $2, $3, $4)
        `, [count, startDate, endDate, userId]);
    }
    
    async cleanupGeneratedTrips(startDate: Date, endDate: Date): Promise<void> {
        await pgNone(`
            DELETE FROM ${tbl.kGeneratedTrip} 
            WHERE actual_departure_time >= $1 
            AND actual_departure_time <= $2
            AND status = 'scheduled'
        `, [startDate, endDate]);
    }
}