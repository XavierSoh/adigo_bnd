export declare class TripGenerationService {
    generateTripsForPeriod(startDate: Date, endDate: Date, userId: number): Promise<number>;
    private generateTripInstances;
    private isValidDateForTrip;
    private isValidDaily;
    private isValidWeekly;
    private isValidMonthly;
    private isExceptionDate;
    private incrementDate;
    private createTripInstance;
    private getBusCapacity;
    private logGeneration;
    cleanupGeneratedTrips(startDate: Date, endDate: Date): Promise<void>;
}
