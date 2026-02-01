import { Request, Response } from "express";
import { TicketRepository } from "../../repository/ticketing";

export class TicketController {

    static async getMyTickets(req: Request, res: Response) {
        const customerId = parseInt(req.params.customerId);
        const result = await TicketRepository.findByCustomerId(customerId);
        res.status(result.code).json(result);
    }

    static async getById(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await TicketRepository.findById(id);
        res.status(result.code).json(result);
    }

    static async getByReference(req: Request, res: Response) {
        const reference = req.params.reference;
        const result = await TicketRepository.findByReference(reference);
        res.status(result.code).json(result);
    }

    static async purchase(req: Request, res: Response) {
        const result = await TicketRepository.purchase(req.body);
        res.status(result.code).json(result);
    }

    static async confirmPayment(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await TicketRepository.confirmPayment(id, req.body);
        res.status(result.code).json(result);
    }

    static async validate(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await TicketRepository.validate(id);
        res.status(result.code).json(result);
    }

    static async validateByQr(req: Request, res: Response) {
        const qrCode = req.body.qr_code;
        if (!qrCode) {
            res.status(400).json({ status: false, message: "QR code requis", code: 400 });
            return;
        }
        const result = await TicketRepository.validateByQr(qrCode);
        res.status(result.code).json(result);
    }

    static async cancel(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await TicketRepository.cancel(id);
        res.status(result.code).json(result);
    }
}
