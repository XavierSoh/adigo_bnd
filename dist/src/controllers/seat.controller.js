"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatController = void 0;
const seat_repository_1 = require("../repository/seat.repository");
class SeatController {
    static async create(req, res) {
        try {
            const seatData = {
                id: 0, // auto-généré par la DB
                bus_id: parseInt(req.body.bus_id),
                seat_number: req.body.seat_number,
                seat_type: req.body.seat_type,
                is_active: req.body.is_active ?? true,
            };
            // Validation basique
            if (!seatData.bus_id || isNaN(seatData.bus_id)) {
                res.status(400).json({ status: false, message: "Bus ID invalide", code: 400 });
                return;
            }
            if (!seatData.seat_number) {
                res.status(400).json({ status: false, message: "Numéro de siège requis", code: 400 });
                return;
            }
            if (!["standard", "premium", "extra_legroom"].includes(seatData.seat_type)) {
                res.status(400).json({ status: false, message: "Type de siège invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.create(seatData);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.findById(id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
    static async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }
            const updateData = {};
            if (req.body.bus_id !== undefined)
                updateData.bus_id = parseInt(req.body.bus_id);
            if (req.body.seat_number !== undefined)
                updateData.seat_number = req.body.seat_number;
            if (req.body.seat_type !== undefined)
                updateData.seat_type = req.body.seat_type;
            if (req.body.is_active !== undefined)
                updateData.is_active = req.body.is_active;
            if (updateData.seat_type && !["standard", "premium", "extra_legroom"].includes(updateData.seat_type)) {
                res.status(400).json({ status: false, message: "Type de siège invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.update(id, updateData);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
    static async softDelete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.softDelete(id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
    static async restore(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.restore(id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.delete(id);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
    static async getByBus(req, res) {
        try {
            const busId = parseInt(req.params.busId);
            if (isNaN(busId)) {
                res.status(400).json({ status: false, message: "Bus ID invalide", code: 400 });
                return;
            }
            const result = await seat_repository_1.SeatRepository.findAllByBus(busId);
            res.status(result.code).json(result);
        }
        catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
}
exports.SeatController = SeatController;
