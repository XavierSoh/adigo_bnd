

import { Router } from "express";
import { BusController } from "../controllers/bus.controller";

const busRouter = Router();

// Création d’un bus
busRouter.post("/", BusController.createBus);
busRouter.post("/bulk_sample_create", BusController.createBulkBusesSample);

// Récupération de tous les bus (avec filtres optionnels ?agency_id=&is_deleted=)
busRouter.get("/", BusController.getAllBuses);

// Récupération d’un bus par ID
busRouter.get("/:id", BusController.getBusById);

// Mise à jour d’un bus
busRouter.put("/:id", BusController.updateBus);

// Soft delete (désactivation logique)
busRouter.delete("/:id/soft", BusController.softDeleteBus);

// Restauration d’un bus supprimé
busRouter.patch("/:id/restore", BusController.restoreBus);

// Suppression définitive
busRouter.delete("/:id", BusController.deleteBus);

export default busRouter;
