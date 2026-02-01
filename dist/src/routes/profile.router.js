"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = __importDefault(require("../controllers/profile.controller"));
const profilerRouter = (0, express_1.Router)();
profilerRouter.get('/', profile_controller_1.default.getProfiles);
profilerRouter.post('/', profile_controller_1.default.createProfile);
profilerRouter.put('/:id', profile_controller_1.default.updateProfile);
profilerRouter.delete('/:id', profile_controller_1.default.deleteProfile);
profilerRouter.delete('/:profileId/:userId', profile_controller_1.default.softDeleteProfile);
profilerRouter.patch('/restore/:profileId/:userId', profile_controller_1.default.restoreProfile);
exports.default = profilerRouter;
