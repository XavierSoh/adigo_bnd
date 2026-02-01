import { Router } from "express";
import { AgencyController } from "../controllers/agency.controller";
import multer from "multer";
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads'); // dossier de destination
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'agency_logo_' + uniqueSuffix + ext);
  }
});
 
const upload = multer({ storage });
const router = Router();

router.post("/", upload.single('logo'), AgencyController.createAgency);
router.get("/", AgencyController.getAllAgencies);
router.get("/:id", AgencyController.getAgencyById);
router.put("/:id", upload.single('logo'), AgencyController.updateAgency);
router.delete("/:id/soft", AgencyController.softDeleteAgency);
router.delete("/:id", AgencyController.deleteAgency);
router.patch("/:id/restore", AgencyController.restoreAgency);
router.post('/bulck_create_sample', AgencyController.bulkSampleCreate);

export default router;