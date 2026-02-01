"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trip_controller_1 = require("../controllers/trip.controller");
const tripRouter = (0, express_1.Router)();
// Specialized routes (must come BEFORE parameterized routes like /:id)
tripRouter.get('/search', trip_controller_1.TripController.searchByRoute);
tripRouter.get('/agency/:agencyId', trip_controller_1.TripController.getByAgency);
// CRUD routes
tripRouter.post('/', trip_controller_1.TripController.create);
tripRouter.get('/:id', trip_controller_1.TripController.getById);
tripRouter.put('/:id', trip_controller_1.TripController.update);
tripRouter.delete('/:id', trip_controller_1.TripController.delete);
// Specialized routes with :id parameter
tripRouter.patch('/:id/soft-delete', trip_controller_1.TripController.softDelete);
tripRouter.patch('/:id/restore', trip_controller_1.TripController.restore);
exports.default = tripRouter;
