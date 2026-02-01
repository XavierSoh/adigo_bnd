import { Request, Response } from 'express';
export declare class ContractTypeController {
    static create(req: Request, res: Response): Promise<any>;
    static findById(req: Request, res: Response): Promise<any>;
    static findAll(req: Request, res: Response): Promise<any>;
    static update(req: Request, res: Response): Promise<any>;
    static delete(req: Request, res: Response): Promise<any>;
    static softDelete(req: Request, res: Response): Promise<any>;
    static restore(req: Request, res: Response): Promise<any>;
}
