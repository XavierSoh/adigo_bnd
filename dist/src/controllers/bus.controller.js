"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusController = void 0;
const bus_repository_1 = require("../repository/bus.repository");
class BusController {
    static async createBus(req, res) {
        const response = await bus_repository_1.BusRepository.create(req.body);
        res.status(response.code).json(response);
    }
    static async getAllBuses(req, res) {
        try {
            const agencyId = req.query.agency_id ? parseInt(req.query.agency_id) : undefined;
            const isDeleted = req.query.is_deleted ? (req.query.is_deleted === 'true') : false;
            const response = await bus_repository_1.BusRepository.findAllByAgency(agencyId, isDeleted);
            res.status(response.code).json(response);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }
    static async getBusById(req, res) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }
        const response = await bus_repository_1.BusRepository.findById(id);
        res.status(response.code).json(response);
    }
    static async updateBus(req, res) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }
        const response = await bus_repository_1.BusRepository.update(id, req.body);
        res.status(response.code).json(response);
    }
    static async softDeleteBus(req, res) {
        const id = parseInt(req.params.id);
        const deleted_by = req.body.deleted_by;
        if (isNaN(id) || !deleted_by) {
            return res.status(400).json({ status: false, message: "Paramètres invalides", code: 400 });
        }
        const response = await bus_repository_1.BusRepository.softDelete(id, deleted_by);
        res.status(response.code).json(response);
    }
    static async restoreBus(req, res) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }
        const response = await bus_repository_1.BusRepository.restore(id);
        res.status(response.code).json(response);
    }
    static async deleteBus(req, res) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }
        const response = await bus_repository_1.BusRepository.delete(id);
        res.status(response.code).json(response);
    }
    static async createBulkBuses(req, res) {
        const buses = req.body;
        if (!Array.isArray(buses) || buses.length === 0) {
            return res.status(400).json({ status: false, message: "Liste de bus invalide", code: 400 });
        }
        try {
            const response = await bus_repository_1.BusRepository.bulkCreate(buses);
            res.status(response.code).json(response);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }
    static getBulkBusesSampleData() {
        const agencyIds = [1, 7, 8, 11, 10, 9];
        const types = ['standard', 'VIP'];
        const seatLayouts = ['2x2', '3x2'];
        const amenitiesList = [
            ['wifi', 'ac'],
            ['wifi', 'toilet', 'ac'],
            ['ac', 'toilet'],
            ['wifi'],
            ['ac'],
            ['wifi', 'ac', 'toilet'],
        ];
        let buses = [];
        let regNum = 1000;
        agencyIds.forEach((agency_id, idx) => {
            for (let i = 0; i < 3; i++) {
                buses.push({
                    registration_number: `BUS-${agency_id}-${regNum++}`,
                    capacity: 40 + i * 5,
                    type: types[i % types.length],
                    amenities: amenitiesList[(idx + i) % amenitiesList.length],
                    seat_layout: seatLayouts[i % seatLayouts.length],
                    has_toilet: amenitiesList[(idx + i) % amenitiesList.length].includes('toilet'),
                    is_active: true,
                    agency_id,
                    created_by: 1,
                });
            }
        });
        return buses;
    }
    static async createBulkBusesSample(req, res) {
        try {
            const sampleBuses = BusController.getBulkBusesSampleData();
            const response = await bus_repository_1.BusRepository.bulkCreate(sampleBuses);
            res.status(response.code).json(response);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }
}
exports.BusController = BusController;
