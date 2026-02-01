export declare class TripSchedulerService {
    private generationService;
    constructor();
    /**
     * Planifie la génération automatique des voyages
     */
    startScheduling(): void;
    /**
     * Nettoie les voyages passés
     */
    private cleanupPastTrips;
}
