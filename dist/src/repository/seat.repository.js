"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const table_names_1 = require("../utils/table_names");
class SeatRepository {
    static async create(seat) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kSeat} (
                    bus_id, seat_number, seat_type, is_active
                ) VALUES ($1, $2, $3, $4)
                RETURNING *`, [
                seat.bus_id,
                seat.seat_number,
                seat.seat_type,
                seat.is_active ?? true
            ]);
            return { status: true, message: "Siège créé", body: result, code: 201 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la création du siège", code: 500 };
        }
    }
    static async findById(id) {
        try {
            const seat = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kSeat} WHERE id = $1 AND is_active = TRUE`, [id]);
            if (!seat) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }
            return { status: true, message: "Siège trouvé", body: seat, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche du siège", code: 500 };
        }
    }
    static async update(id, seat) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kSeat} SET
                    bus_id = COALESCE($1, bus_id),
                    seat_number = COALESCE($2, seat_number),
                    seat_type = COALESCE($3, seat_type),
                    is_active = COALESCE($4, is_active)
                WHERE id = $5
                RETURNING *`, [
                seat.bus_id,
                seat.seat_number,
                seat.seat_type,
                seat.is_active,
                id
            ]);
            if (!result) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }
            return { status: true, message: "Siège mis à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du siège", code: 500 };
        }
    }
    static async softDelete(id) {
        try {
            const result = await pgdb_1.default.result(`UPDATE ${table_names_1.kSeat} SET is_active = FALSE WHERE id = $1 AND is_active = TRUE`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: "Siège non trouvé ou déjà désactivé", code: 404 };
            }
            return { status: true, message: "Siège désactivé", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la désactivation du siège", code: 500 };
        }
    }
    static async restore(id) {
        try {
            const result = await pgdb_1.default.result(`UPDATE ${table_names_1.kSeat} SET is_active = TRUE WHERE id = $1 AND is_active = FALSE`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: "Siège non trouvé ou déjà actif", code: 404 };
            }
            return { status: true, message: "Siège restauré", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la restauration du siège", code: 500 };
        }
    }
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kSeat} WHERE id = $1`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }
            return { status: true, message: "Siège supprimé définitivement", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression du siège", code: 500 };
        }
    }
    static async findAllByBus(busId) {
        try {
            const seats = await pgdb_1.default.any(`SELECT * FROM ${table_names_1.kSeat} WHERE bus_id = $1 ORDER BY seat_number ASC`, [busId]);
            return { status: true, message: "Liste des sièges récupérée", body: seats, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges", code: 500 };
        }
    }
}
exports.SeatRepository = SeatRepository;
