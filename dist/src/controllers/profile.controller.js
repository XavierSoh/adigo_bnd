"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const profile_repository_1 = __importDefault(require("../repository/profile.repository"));
class ProfileController {
    static async getProfiles(req, res) {
        const is_deleted = req.query.is_deleted === 'true' ? true : false;
        try {
            const response = await profile_repository_1.default.getAllProfiles(is_deleted);
            return res.status(response.code).json(response);
        }
        catch (error) {
            console.error("Error fetching profiles:", error);
            const responseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while fetching profiles.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json();
        }
    }
    static async createProfile(req, res) {
        const profile = req.body;
        try {
            const response = await profile_repository_1.default.createProfile(profile);
            return res.status(response.code).json(response);
        }
        catch (error) {
            const responseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while creating the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json(responseModel);
        }
    }
    static async updateProfile(req, res) {
        const profile = req.body;
        try {
            const response = await profile_repository_1.default.updateProfile(profile);
            return res.status(response.code).json(response);
        }
        catch (error) {
            const responseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while updating the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json(responseModel);
        }
    }
    static async deleteProfile(req, res) {
        const profileId = req.params.id;
        try {
            const response = await profile_repository_1.default.deleteProfile(parseInt(profileId));
            return res.status(response.code).json(response);
        }
        catch (error) {
            const responseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while deleting the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json(responseModel);
        }
    }
    static async softDeleteProfile(req, res) {
        const { profileId, userId } = req.params;
        try {
            const response = await profile_repository_1.default.softDeleteProfile(parseInt(profileId), parseInt(userId));
            return res.status(response.code).json(response);
        }
        catch (error) {
            const responseModel = {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while soft deleting the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
            return res.status(500).json(responseModel);
        }
    }
    static async restoreProfile(req, res) {
        const { profileId, userId } = req.params;
        try {
            const response = await profile_repository_1.default.restoreProfile(parseInt(profileId), parseInt(userId));
            return res.status(response.code).json(response);
        }
        catch (error) {
            const responseModel = {
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
exports.default = ProfileController;
