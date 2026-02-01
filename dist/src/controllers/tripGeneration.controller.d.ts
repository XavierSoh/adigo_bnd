import { Request, Response } from 'express';
export declare const tripGenerationController: {
    /**
     * Génère les voyages pour une période spécifique
     */
    generateTrips: (req: Request, res: Response) => Promise<void>;
    /**
     * Récupère les voyages générés pour une période
     */
    getGeneratedTrips: (req: Request, res: Response) => Promise<void>;
};
