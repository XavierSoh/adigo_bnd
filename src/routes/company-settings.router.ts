import { Router } from "express";
import { CompanySettingsController } from "../controllers/company-settings.controller";
import multer from "multer";
import path from 'path';

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/logos'); // destination folder for Adigo logo
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'adigo_logo_' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });
const router = Router();

/**
 * GET /company-settings
 * Get company settings (public - used by mobile app)
 */
router.get("/", CompanySettingsController.getSettings);

/**
 * PUT /company-settings
 * Update company settings (admin only - should be protected by auth middleware)
 * Accepts optional logo file upload
 */
router.put("/", upload.single('logo'), CompanySettingsController.updateSettings);

export default router;
