import { Request, Response } from "express";
export declare class AgencyController {
    static createAgency(req: Request, res: Response): Promise<void>;
    static getAgencyById(req: Request, res: Response): Promise<void>;
    static getAllAgencies(req: Request, res: Response): Promise<void>;
    static updateAgency(req: Request, res: Response): Promise<void>;
    static softDeleteAgency(req: Request, res: Response): Promise<void>;
    static deleteAgency(req: Request, res: Response): Promise<void>;
    static restoreAgency(req: Request, res: Response): Promise<void>;
    static bulkCreateAgencies(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static bulkSampleCreate(req: Request, res: Response): Promise<void>;
}
