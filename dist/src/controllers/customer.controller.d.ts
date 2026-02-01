import { Request, Response } from "express";
export declare class CustomerController {
    static create(req: Request, res: Response): Promise<any>;
    static getById(req: Request, res: Response): Promise<void>;
    static getAll(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static softDelete(req: Request, res: Response): Promise<void>;
    static restore(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<void>;
    static updateLoyaltyPoints(req: Request, res: Response): Promise<void>;
    static verifyEmail(req: Request, res: Response): Promise<void>;
    static verifyPhone(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static bulkCreate(req: Request, res: Response): Promise<void>;
    static bulkCreateSample(req: Request, res: Response): Promise<void>;
    static updateProfilePicture(req: Request, res: Response): Promise<void>;
    static updateFcmToken(req: Request, res: Response): Promise<void>;
    static removeFcmToken(req: Request, res: Response): Promise<void>;
    static getCustomerBookings(req: Request, res: Response): Promise<void>;
}
