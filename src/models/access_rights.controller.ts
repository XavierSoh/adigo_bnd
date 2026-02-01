import { accessRightsRepository } from "../repository/access_rights.repository";
import { Request, Response } from "express"; 
export class AccessRightsController {
     static async getAll(req: Request, res: Response): Promise<any> {
        
        const response = await accessRightsRepository.getAllAccessRights();
        
        return res.status(response.code || 500).json(response);
      }


    

}