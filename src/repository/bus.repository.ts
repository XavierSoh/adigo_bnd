import pgpDb from "../config/pgdb";
import { BusModel } from "../models/bus.model";
import ResponseModel from "../models/response.model";
import { kBus } from "../utils/table_names";

export class BusRepository {
    static async create(bus: BusModel): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `INSERT INTO ${kBus} (
                    registration_number, capacity, type, amenities, 
                    seat_layout, has_toilet, is_active, agency_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    bus.registration_number,
                    bus.capacity,
                    bus.type,
                    bus.amenities,
                    bus.seat_layout,
                    bus.has_toilet,
                    bus.is_active,
                    bus.agency_id,
                    bus.created_by
                ]
            );
            return { status: true, message: 'Bus créé', body: result, code: 201 };
        } catch (error) {
            console.log(`Error >>>>>>>>>>>>>> ${JSON.stringify(error)}`)
            return { status: false, message: 'Erreur création bus', code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const bus = await pgpDb.oneOrNone(
                `SELECT * FROM ${kBus} WHERE id = $1 AND is_deleted = FALSE`,
                [id]
            );
            if (!bus) {
                return { status: false, message: 'Bus non trouvé', code: 404 };
            }
            return { status: true, message: 'Bus trouvé', body: bus, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la recherche', code: 500 };
        }
    }

    static async update(id: number, bus: Partial<BusModel>): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kBus} SET 
                    registration_number = COALESCE($1, registration_number),
                    capacity = COALESCE($2, capacity),
                    type = COALESCE($3, type),
                    amenities = COALESCE($4, amenities),
                    seat_layout = COALESCE($5, seat_layout),
                    has_toilet = COALESCE($6, has_toilet),
                    is_active = COALESCE($7, is_active),
                    agency_id = COALESCE($8, agency_id)
                WHERE id = $9 AND is_deleted = FALSE
                RETURNING *`,
                [
                    bus.registration_number,
                    bus.capacity,
                    bus.type,
                    bus.amenities,
                    bus.seat_layout,
                    bus.has_toilet,
                    bus.is_active,
                    bus.agency_id,
                    id
                ]
            );
            if (!result) {
                return { status: false, message: 'Bus non trouvé ou supprimé', code: 404 };
            }
            return { status: true, message: 'Bus mis à jour', body: result, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la mise à jour', code: 500 };
        }
    }

    static async softDelete(id: number, deleted_by: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kBus} SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deleted_by]
            );
            if (result.rowCount === 0) {
                return { status: false, message: 'Bus non trouvé ou déjà supprimé', code: 404 };
            }
            return { status: true, message: 'Bus supprimé temporairement', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la suppression', code: 500 };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kBus} SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL 
                WHERE id = $1 AND is_deleted = TRUE`,
                [id]
            );
            if (result.rowCount === 0) {
                return { status: false, message: 'Bus non trouvé ou déjà restauré', code: 404 };
            }
            return { status: true, message: 'Bus restauré', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la restauration', code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kBus} WHERE id = $1`,
                [id]
            );
            if (result.rowCount === 0) {
                return { status: false, message: 'Bus non trouvé', code: 404 };
            }
            return { status: true, message: 'Bus supprimé définitivement', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la suppression définitive', code: 500 };
        }
    }
    static async findAllByAgency(agencyId: number, isDeleted: boolean): Promise<ResponseModel> {
        try {
            const buses = await pgpDb.any(
                `SELECT * FROM ${kBus} WHERE agency_id = $1 AND is_deleted = $2`,
                [agencyId, isDeleted]
            );
            return { status: true, message: 'Liste des bus récupérée', body: buses, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la récupération des bus', code: 500 };
        }
    }


    static async bulkCreate(buses: BusModel[]): Promise<ResponseModel> {
        if (!buses || buses.length === 0) {
            return { status: false, message: 'Aucun bus à créer', code: 400 };
        }
        const columns = [
            'registration_number', 'capacity', 'type', 'amenities',
            'seat_layout', 'has_toilet', 'is_active', 'agency_id', 'created_by'
        ];
        const values = buses.map(bus => [
            bus.registration_number,
            bus.capacity,
            bus.type,
            bus.amenities,
            bus.seat_layout,
            bus.has_toilet,
            bus.is_active,
            bus.agency_id,
            bus.created_by
        ]);
        const cs = new pgpDb.$config.pgp.helpers.ColumnSet(columns, { table: kBus });
        const query = pgpDb.$config.pgp.helpers.insert(buses, cs) + ' RETURNING *';
        try {
            const result = await pgpDb.many(query);
            return { status: true, message: 'Bus créés en masse', body: result, code: 201 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la création en masse', code: 500 };
        }
    }
    
}
