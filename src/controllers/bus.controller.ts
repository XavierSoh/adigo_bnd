import { Request, Response } from "express";
import { BusRepository } from "../repository/bus.repository";
import { BusModel } from "../models/bus.model";

export class BusController {
    static async createBus(req: Request, res: Response) {
        const response = await BusRepository.create(req.body);
        res.status(response.code).json(response);
    }

    static async getAllBuses(req: Request, res: Response) {
        try {
            const agencyId = req.query.agency_id ? parseInt(req.query.agency_id as string) : undefined;
            const isDeleted = req.query.is_deleted ? (req.query.is_deleted === 'true') : false;
            const response = await BusRepository.findAllByAgency( agencyId, isDeleted);
            res.status(response.code).json(response);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }

    static async getBusById(req: Request, res: Response): Promise<any> {
        const id = parseInt((req.params as { id: string }).id);
        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }

        const response = await BusRepository.findById(id);
        res.status(response.code).json(response);
    }

    static async updateBus(req: Request, res: Response):Promise<any> {
        const id = parseInt((req.params as { id: string }).id);
        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }

        const response = await BusRepository.update(id, req.body);
        res.status(response.code).json(response);
    }

    static async softDeleteBus(req: Request, res: Response):Promise<any> {
        const id = parseInt((req.params as { id: string }).id);
        const deleted_by = req.body.deleted_by;

        if (isNaN(id) || !deleted_by) {
            return res.status(400).json({ status: false, message: "Paramètres invalides", code: 400 });
        }

        const response = await BusRepository.softDelete(id, deleted_by);
        res.status(response.code).json(response);
    }

    static async restoreBus(req: Request, res: Response):Promise<any> {
        const id = parseInt((req.params as { id: string }).id);

        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }

        const response = await BusRepository.restore(id);
        res.status(response.code).json(response);
    }

    static async deleteBus(req: Request, res: Response):Promise<any> {
        const id = parseInt((req.params as { id: string }).id);

        if (isNaN(id)) {
            return res.status(400).json({ status: false, message: "ID invalide", code: 400 });
        }

        const response = await BusRepository.delete(id);
        res.status(response.code).json(response);
    }

    static async createBulkBuses(req: Request, res: Response): Promise<any> {
        const buses: BusModel[] = req.body;
        if (!Array.isArray(buses) || buses.length === 0) {
            return res.status(400).json({ status: false, message: "Liste de bus invalide", code: 400 });
        }

        try {
            const response = await BusRepository.bulkCreate(buses);
            res.status(response.code).json(response);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }


    static getBulkBusesSampleData(): BusModel[] {
        const agencyIds = [1, 7, 8, 11, 10, 9];
        const types: Array<'standard' | 'VIP'> = ['standard', 'VIP'];
        const seatLayouts: Array<'2x2' | '3x2'> = ['2x2', '3x2'];
        const amenitiesList = [
            ['wifi', 'ac'],
            ['wifi', 'toilet', 'ac'],
            ['ac', 'toilet'],
            ['wifi'],
            ['ac'],
            ['wifi', 'ac', 'toilet'],
        ];

        let buses: BusModel[] = [];
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

    static async createBulkBusesSample(req: Request, res: Response): Promise<any> {
        try {
            const sampleBuses = BusController.getBulkBusesSampleData();
            const response = await BusRepository.bulkCreate(sampleBuses);
            res.status(response.code).json(response);
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }
}
