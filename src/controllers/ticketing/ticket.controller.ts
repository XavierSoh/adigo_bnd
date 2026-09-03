import { Request, Response } from "express";
import { TicketRepository } from "../../repository/ticketing/ticket.repository";

export class TicketController {

    static async getMyTickets(req: Request, res: Response) {
        const { customerId } = req.params as { customerId: string };
        const response = await TicketRepository.findByCustomerId(parseInt(customerId));
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.findById(parseInt(id));
        res.status(response.code).json(response);
    }

    static async getByReference(req: Request, res: Response) {
        const { reference } = req.params as { reference: string };
        const response = await TicketRepository.findByReference(reference);
        res.status(response.code).json(response);
    }

    static async purchase(req: Request, res: Response) {
        const response = await TicketRepository.purchase(req.body);
        res.status(response.code).json(response);
    }

    static async confirmPayment(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.confirmPayment(parseInt(id), req.body);
        res.status(response.code).json(response);
    }

    static async validate(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.validate(parseInt(id));
        res.status(response.code).json(response);
    }

    static async validateByQr(req: Request, res: Response) {
        const { qr_code } = req.body as { qr_code: string };
        const response = await TicketRepository.validateByQr(qr_code);
        res.status(response.code).json(response);
    }

    static async cancel(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketRepository.cancel(parseInt(id));
        res.status(response.code).json(response);
    }
}
