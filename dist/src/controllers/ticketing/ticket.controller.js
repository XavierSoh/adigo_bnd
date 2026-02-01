"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const ticketing_1 = require("../../repository/ticketing");
class TicketController {
    static async getMyTickets(req, res) {
        const customerId = parseInt(req.params.customerId);
        const result = await ticketing_1.TicketRepository.findByCustomerId(customerId);
        res.status(result.code).json(result);
    }
    static async getById(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.TicketRepository.findById(id);
        res.status(result.code).json(result);
    }
    static async getByReference(req, res) {
        const reference = req.params.reference;
        const result = await ticketing_1.TicketRepository.findByReference(reference);
        res.status(result.code).json(result);
    }
    static async purchase(req, res) {
        const result = await ticketing_1.TicketRepository.purchase(req.body);
        res.status(result.code).json(result);
    }
    static async confirmPayment(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.TicketRepository.confirmPayment(id, req.body);
        res.status(result.code).json(result);
    }
    static async validate(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.TicketRepository.validate(id);
        res.status(result.code).json(result);
    }
    static async validateByQr(req, res) {
        const qrCode = req.body.qr_code;
        if (!qrCode) {
            res.status(400).json({ status: false, message: "QR code requis", code: 400 });
            return;
        }
        const result = await ticketing_1.TicketRepository.validateByQr(qrCode);
        res.status(result.code).json(result);
    }
    static async cancel(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.TicketRepository.cancel(id);
        res.status(result.code).json(result);
    }
}
exports.TicketController = TicketController;
