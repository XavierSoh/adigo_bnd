// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 4).
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";

export class TripGenerationService {

    async generateTripsForPeriod(startDate: Date, endDate: Date, userId: number): Promise<number> {
        let generatedCount = 0;

        try {
            console.log(`📅 Génération du ${startDate.toISOString()} au ${endDate.toISOString()}`);

            // 1. Récupérer tous les trips avec récurrence
            const rows = await prismaDb.trip.findMany({
                where: {
                    is_active: true,
                    is_deleted: false,
                    OR: [{ valid_until: null }, { valid_until: { gte: startDate } }],
                    valid_from: { lte: endDate },
                },
                include: { recurrence_pattern: true },
            });

            // Flatten `recurrence_pattern.*` onto the trip row under the
            // same field names the rest of this file's (unconverted, pure
            // JS) recurrence logic already expects — matches the original
            // raw SQL's own aliasing exactly.
            const trips = rows.map((t) => {
                const { recurrence_pattern, ...rest } = t;
                return {
                    ...rest,
                    recurrence_type: recurrence_pattern?.type ?? null,
                    interval: recurrence_pattern?.interval ?? null,
                    days_of_week: recurrence_pattern?.days_of_week ?? null,
                    recurrence_end_date: recurrence_pattern?.end_date ?? null,
                    exceptions: recurrence_pattern?.exceptions ?? null,
                };
            });

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

        try {
            await prismaDb.generated_trip.create({
                data: {
                    trip_id: trip.id,
                    original_departure_time: trip.departure_time,
                    actual_departure_time: departureTime,
                    actual_arrival_time: arrivalTime,
                    available_seats: busCapacity,
                    bus_id: trip.bus_id,
                },
            });
        } catch (error) {
            // `ON CONFLICT (trip_id, actual_departure_time) DO NOTHING` —
            // silently ignore the unique-constraint violation, exactly
            // like the original; anything else still propagates.
            if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
                throw error;
            }
        }
    }

    private async getBusCapacity(busId: number): Promise<number> {
        const bus = await prismaDb.bus.findFirst({
            where: { id: busId, is_deleted: false },
            select: { capacity: true },
        });

        return bus?.capacity || 0;
    }

    private async logGeneration(startDate: Date, endDate: Date, count: number, userId: number): Promise<void> {
        await prismaDb.trip_generation_log.create({
            data: {
                generation_date: new Date(),
                trips_generated: count,
                period_start: startDate,
                period_end: endDate,
                generated_by: userId,
            },
        });
    }

    async cleanupGeneratedTrips(startDate: Date, endDate: Date): Promise<void> {
        await prismaDb.generated_trip.deleteMany({
            where: {
                actual_departure_time: { gte: startDate, lte: endDate },
                status: 'scheduled',
            },
        });
    }
}
