import { ProfileModel } from "../models/profile.model";
import ResponseModel from "../models/response.model";
export default class ProfileRepository {
    static getAllProfiles(is_deleted: boolean): Promise<ResponseModel>;
    static createProfile(profile: ProfileModel): Promise<ResponseModel>;
    static updateProfile(profileModel: ProfileModel): Promise<ResponseModel>;
    static softDeleteProfile(profileId: number, userId: number): Promise<ResponseModel>;
    static restoreProfile(profileId: number, userId: number): Promise<ResponseModel>;
    static deleteProfile(profileId: number): Promise<ResponseModel>;
}
