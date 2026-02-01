"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_settings_controller_1 = require("../controllers/company-settings.controller");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Configure multer for logo upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/logos'); // destination folder for Adigo logo
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, 'adigo_logo_' + uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
/**
 * GET /company-settings
 * Get company settings (public - used by mobile app)
 */
router.get("/", company_settings_controller_1.CompanySettingsController.getSettings);
/**
 * PUT /company-settings
 * Update company settings (admin only - should be protected by auth middleware)
 * Accepts optional logo file upload
 */
router.put("/", upload.single('logo'), company_settings_controller_1.CompanySettingsController.updateSettings);
exports.default = router;
