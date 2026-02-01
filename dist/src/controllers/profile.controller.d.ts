import { Request, Response } from "express";
export default class ProfileController {
    static getProfiles(req: Request, res: Response): Promise<any>;
    static createProfile(req: Request, res: Response): Promise<any>;
    static updateProfile(req: Request, res: Response): Promise<any>;
    static deleteProfile(req: Request, res: Response): Promise<any>;
    static softDeleteProfile(req: Request, res: Response): Promise<any>;
    static restoreProfile(req: Request, res: Response): Promise<any>;
}
