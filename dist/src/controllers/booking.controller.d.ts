import { Request, Response } from "express";
export declare class BookingController {
    static createMultiple(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getAll(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static softDelete(req: Request, res: Response): Promise<void>;
    static restore(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getBookedSeats(req: Request, res: Response): Promise<void>;
    static checkSeatAvailability(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static getRevenueStatistics(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static getByDateRange(req: Request, res: Response): Promise<void>;
    static getRecent(req: Request, res: Response): Promise<void>;
    static cancelBatch(req: Request, res: Response): Promise<void>;
    static createBatch(req: Request, res: Response): Promise<void>;
    static cleanup(req: Request, res: Response): Promise<void>;
    static getSoftDeleted(req: Request, res: Response): Promise<void>;
    /**
     * Cancel a single booking with validation rules
     * Rules:
     * - Booking must exist and belong to the requesting customer
     * - Status must be 'confirmed' or 'pending'
     * - Booking must not be already cancelled or completed
     */
    static cancelSingle(req: Request, res: Response): Promise<void>;
    /**
     * Modify a single booking (change seat)
     * Rules:
     * - Booking must exist and belong to the requesting customer
     * - Status must be 'confirmed'
     * - Departure time must be at least 2 hours in the future
     * - New seat must be available
     */
    static modifySingle(req: Request, res: Response): Promise<void>;
}
