import { ProfileModel } from "../models/profile.model";
import ResponseModel from "../models/response.model";
import ProfileRepository from "../repository/profile.repository"
import { Request, Response } from "express";
export default class ProfileController{

    static async getProfiles(req:Request, res:Response):Promise<any> {
        const is_deleted = req.query.is_deleted === 'true' ? true : false;
        try {
            const response = await ProfileRepository.getAllProfiles(is_deleted);
            return res.status(response.code).json(response);
        } catch (error) {
            console.error("Error fetching profiles:", error);
            const responseModel:ResponseModel =  {
                status: false,
                message:error instanceof Error?error.message : "An error occurred while fetching profiles.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            } 
            return res.status(500).json(  );
        }
    }
 

    static async createProfile(req:Request, res:Response):Promise<any> {
        const profile = req.body;
        try {
            const response = await ProfileRepository.createProfile(profile);

            return res.status(response.code).json(response);
        } catch (error) {
         
            const responseModel:ResponseModel =  {
                status: false,
                message:error instanceof Error?error.message : "An error occurred while creating the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            } 
            return res.status(500).json(responseModel);
        }
    }  

    static async updateProfile(req:Request, res:Response):Promise<any> {
        const profile:ProfileModel = req.body;
        try {
            const response = await ProfileRepository.updateProfile( profile);
            return res.status(response.code).json(response);
        } catch (error) {
         
            const responseModel:ResponseModel =  {
                status: false,
                message:error instanceof Error?error.message : "An error occurred while updating the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            } 
            return res.status(500).json(responseModel);
        }
    }   
    
    
    static async deleteProfile(req: Request, res: Response): Promise<any> {
        const profileId = req.params.id;
        try {
            const response = await ProfileRepository.deleteProfile(parseInt(profileId));
            return res.status(response.code).json(response);
        } catch (error) {
            const responseModel: ResponseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while deleting the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json(responseModel);
        }
    }

    static async softDeleteProfile(req: Request, res: Response): Promise<any> {
        const {profileId, userId} = req.params;
        
        try {
            const response = await ProfileRepository.softDeleteProfile(parseInt(profileId), parseInt(userId));
            return res.status(response.code).json(response);
        } catch (error) {
            const responseModel: ResponseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while soft deleting the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json(responseModel);
        }
    }

    static async restoreProfile(req: Request, res: Response): Promise<any> {
    const { profileId, userId } = req.params;

    try {
        const response = await ProfileRepository.restoreProfile(parseInt(profileId), parseInt(userId));
        return res.status(response.code).json(response);
    } catch (error) {
        const responseModel: ResponseModel = {
            status: false,
            message: error instanceof Error ? error.message : "An error occurred while restoring the profile.",
            body: null,
            code: 500,
            exception: error instanceof Error ? error.stack : undefined
        };
        return res.status(500).json(responseModel);
    }
}

       

}