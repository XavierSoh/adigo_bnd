"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const table_names_1 = require("../utils/table_names");
class BusRepository {
    static async create(bus) {
        try {
            const result = await pgdb_1.default.oneOrNone(`INSERT INTO ${table_names_1.kBus} (
                    registration_number, capacity, type, amenities, 
                    seat_layout, has_toilet, is_active, agency_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`, [
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
            return { status: true, message: 'Bus créé', body: result, code: 201 };
        }
        catch (error) {
            console.log(`Error >>>>>>>>>>>>>> ${JSON.stringify(error)}`);
            return { status: false, message: 'Erreur création bus', code: 500 };
        }
    }
    static async findById(id) {
        try {
            const bus = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kBus} WHERE id = $1 AND is_deleted = FALSE`, [id]);
            if (!bus) {
                return { status: false, message: 'Bus non trouvé', code: 404 };
            }
            return { status: true, message: 'Bus trouvé', body: bus, code: 200 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la recherche', code: 500 };
        }
    }
    static async update(id, bus) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kBus} SET 
                    registration_number = COALESCE($1, registration_number),
                    capacity = COALESCE($2, capacity),
                    type = COALESCE($3, type),
                    amenities = COALESCE($4, amenities),
                    seat_layout = COALESCE($5, seat_layout),
                    has_toilet = COALESCE($6, has_toilet),
                    is_active = COALESCE($7, is_active),
                    agency_id = COALESCE($8, agency_id)
                WHERE id = $9 AND is_deleted = FALSE
                RETURNING *`, [
                bus.registration_number,
                bus.capacity,
                bus.type,
                bus.amenities,
                bus.seat_layout,
                bus.has_toilet,
                bus.is_active,
                bus.agency_id,
                id
            ]);
            if (!result) {
                return { status: false, message: 'Bus non trouvé ou supprimé', code: 404 };
            }
            return { status: true, message: 'Bus mis à jour', body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la mise à jour', code: 500 };
        }
    }
    static async softDelete(id, deleted_by) {
        try {
            const result = await pgdb_1.default.result(`UPDATE ${table_names_1.kBus} SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 
                WHERE id = $1 AND is_deleted = FALSE`, [id, deleted_by]);
            if (result.rowCount === 0) {
                return { status: false, message: 'Bus non trouvé ou déjà supprimé', code: 404 };
            }
            return { status: true, message: 'Bus supprimé temporairement', code: 200 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la suppression', code: 500 };
        }
    }
    static async restore(id) {
        try {
            const result = await pgdb_1.default.result(`UPDATE ${table_names_1.kBus} SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL 
                WHERE id = $1 AND is_deleted = TRUE`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: 'Bus non trouvé ou déjà restauré', code: 404 };
            }
            return { status: true, message: 'Bus restauré', code: 200 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la restauration', code: 500 };
        }
    }
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kBus} WHERE id = $1`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: 'Bus non trouvé', code: 404 };
            }
            return { status: true, message: 'Bus supprimé définitivement', code: 200 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la suppression définitive', code: 500 };
        }
    }
    static async findAllByAgency(agencyId, isDeleted) {
        try {
            const buses = await pgdb_1.default.any(`SELECT * FROM ${table_names_1.kBus} WHERE agency_id = $1 AND is_deleted = $2`, [agencyId, isDeleted]);
            return { status: true, message: 'Liste des bus récupérée', body: buses, code: 200 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la récupération des bus', code: 500 };
        }
    }
    static async bulkCreate(buses) {
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
        const cs = new pgdb_1.default.$config.pgp.helpers.ColumnSet(columns, { table: table_names_1.kBus });
        const query = pgdb_1.default.$config.pgp.helpers.insert(buses, cs) + ' RETURNING *';
        try {
            const result = await pgdb_1.default.many(query);
            return { status: true, message: 'Bus créés en masse', body: result, code: 201 };
        }
        catch (error) {
            return { status: false, message: 'Erreur lors de la création en masse', code: 500 };
        }
    }
}
exports.BusRepository = BusRepository;
