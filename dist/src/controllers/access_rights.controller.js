"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessRightsController = void 0;
const access_rights_repository_1 = require("../repository/access_rights.repository");
class AccessRightsController {
    static async getAll(req, res) {
        const response = await access_rights_repository_1.accessRightsRepository.getAllAccessRights();
        return res.status(response.code || 500).json(response);
    }
}
exports.AccessRightsController = AccessRightsController;
