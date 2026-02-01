"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bus_controller_1 = require("../controllers/bus.controller");
const busRouter = (0, express_1.Router)();
// Création d’un bus
busRouter.post("/", bus_controller_1.BusController.createBus);
busRouter.post("/bulk_sample_create", bus_controller_1.BusController.createBulkBusesSample);
// Récupération de tous les bus (avec filtres optionnels ?agency_id=&is_deleted=)
busRouter.get("/", bus_controller_1.BusController.getAllBuses);
// Récupération d’un bus par ID
busRouter.get("/:id", bus_controller_1.BusController.getBusById);
// Mise à jour d’un bus
busRouter.put("/:id", bus_controller_1.BusController.updateBus);
// Soft delete (désactivation logique)
busRouter.delete("/:id/soft", bus_controller_1.BusController.softDeleteBus);
// Restauration d’un bus supprimé
busRouter.patch("/:id/restore", bus_controller_1.BusController.restoreBus);
// Suppression définitive
busRouter.delete("/:id", bus_controller_1.BusController.deleteBus);
exports.default = busRouter;
