"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const access_rights_controller_1 = require("../controllers/access_rights.controller");
const accessRightsRouter = (0, express_1.Router)({ mergeParams: true });
accessRightsRouter.get('/', access_rights_controller_1.AccessRightsController.getAll);
exports.default = accessRightsRouter;
