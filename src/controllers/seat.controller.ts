import { Request, Response } from "express";
import { Seat } from "../models/seat.model";
import { SeatRepository } from "../repository/seat.repository";

export class SeatController {
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const seatData: Seat = {
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

            const result = await SeatRepository.create(seatData);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }

            const result = await SeatRepository.findById(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }

            const updateData: Partial<Seat> = {};
            if (req.body.bus_id !== undefined) updateData.bus_id = parseInt(req.body.bus_id);
            if (req.body.seat_number !== undefined) updateData.seat_number = req.body.seat_number;
            if (req.body.seat_type !== undefined) updateData.seat_type = req.body.seat_type;
            if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

            if (updateData.seat_type && !["standard", "premium", "extra_legroom"].includes(updateData.seat_type)) {
                res.status(400).json({ status: false, message: "Type de siège invalide", code: 400 });
                return;
            }

            const result = await SeatRepository.update(id, updateData);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }

    static async softDelete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }

            const result = await SeatRepository.softDelete(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }

    static async restore(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }

            const result = await SeatRepository.restore(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ status: false, message: "ID invalide", code: 400 });
                return;
            }

            const result = await SeatRepository.delete(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }

    static async getByBus(req: Request, res: Response): Promise<void> {
        try {
            const busId = parseInt(req.params.busId);

            if (isNaN(busId)) {
                res.status(400).json({ status: false, message: "Bus ID invalide", code: 400 });
                return;
            }

            const result = await SeatRepository.findAllByBus(busId);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur interne du serveur", code: 500 });
        }
    }
}
