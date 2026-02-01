import pgpDb from "../config/pgdb";
import { Seat } from "../models/seat.model";  // ton interface Seat
import ResponseModel from "../models/response.model";
import { kSeat } from "../utils/table_names";

export class SeatRepository {
    static async create(seat: Seat): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kSeat} (
                    bus_id, seat_number, seat_type, is_active
                ) VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [
                    seat.bus_id,
                    seat.seat_number,
                    seat.seat_type,
                    seat.is_active ?? true
                ]
            );

            return { status: true, message: "Siège créé", body: result, code: 201 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la création du siège", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const seat = await pgpDb.oneOrNone(
                `SELECT * FROM ${kSeat} WHERE id = $1 AND is_active = TRUE`,
                [id]
            );

            if (!seat) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }

            return { status: true, message: "Siège trouvé", body: seat, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du siège", code: 500 };
        }
    }

    static async update(id: number, seat: Partial<Seat>): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kSeat} SET
                    bus_id = COALESCE($1, bus_id),
                    seat_number = COALESCE($2, seat_number),
                    seat_type = COALESCE($3, seat_type),
                    is_active = COALESCE($4, is_active)
                WHERE id = $5
                RETURNING *`,
                [
                    seat.bus_id,
                    seat.seat_number,
                    seat.seat_type,
                    seat.is_active,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }

            return { status: true, message: "Siège mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du siège", code: 500 };
        }
    }

    static async softDelete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kSeat} SET is_active = FALSE WHERE id = $1 AND is_active = TRUE`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Siège non trouvé ou déjà désactivé", code: 404 };
            }

            return { status: true, message: "Siège désactivé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la désactivation du siège", code: 500 };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kSeat} SET is_active = TRUE WHERE id = $1 AND is_active = FALSE`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Siège non trouvé ou déjà actif", code: 404 };
            }

            return { status: true, message: "Siège restauré", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration du siège", code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kSeat} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }

            return { status: true, message: "Siège supprimé définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du siège", code: 500 };
        }
    }

    static async findAllByBus(busId: number): Promise<ResponseModel> {
        try {
            const seats = await pgpDb.any(
                `SELECT * FROM ${kSeat} WHERE bus_id = $1 ORDER BY seat_number ASC`,
                [busId]
            );

            return { status: true, message: "Liste des sièges récupérée", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges", code: 500 };
        }
    }



}
