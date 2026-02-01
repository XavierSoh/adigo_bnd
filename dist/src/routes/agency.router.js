"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agency_controller_1 = require("../controllers/agency.controller");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads'); // dossier de destination
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, 'agency_logo_' + uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
router.post("/", upload.single('logo'), agency_controller_1.AgencyController.createAgency);
router.get("/", agency_controller_1.AgencyController.getAllAgencies);
router.get("/:id", agency_controller_1.AgencyController.getAgencyById);
router.put("/:id", upload.single('logo'), agency_controller_1.AgencyController.updateAgency);
router.delete("/:id/soft", agency_controller_1.AgencyController.softDeleteAgency);
router.delete("/:id", agency_controller_1.AgencyController.deleteAgency);
router.patch("/:id/restore", agency_controller_1.AgencyController.restoreAgency);
router.post('/bulck_create_sample', agency_controller_1.AgencyController.bulkSampleCreate);
exports.default = router;
