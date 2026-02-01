import { Request, Response } from "express";
export declare class StaffController {
    static createStaff(req: Request, res: Response): Promise<void>;
    static getStaffById(req: Request, res: Response): Promise<void>;
    static getAllStaff(req: Request, res: Response): Promise<void>;
    static updateStaff(req: Request, res: Response): Promise<void>;
    static softDeleteStaff(req: Request, res: Response): Promise<void>;
    static deleteStaff(req: Request, res: Response): Promise<void>;
    static restoreStaff(req: Request, res: Response): Promise<void>;
    static updateSalaryPayment(req: Request, res: Response): Promise<void>;
    static getStaffWithoutUser(req: Request, res: Response): Promise<void>;
    static generateUniqueStaffNumber(req: Request, res: Response): Promise<void>;
}
