"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractTypeRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const tbl = __importStar(require("../utils/table_names"));
class ContractTypeRepository {
    // CREATE
    static async create(data) {
        try {
            delete data.id;
            const keys = Object.keys(data);
            const values = keys.map((k) => data[k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`);
            const query = `
        INSERT INTO ${tbl.kContractType} (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
            const created = await pgdb_1.default.one(query, values);
            return {
                status: true,
                code: 201,
                message: 'ContractType created',
                body: created,
            };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Failed to create',
                exception: error,
                body: {},
            };
        }
    }
    // FIND ALL
    static async findAll(includeDeleted = false) {
        try {
            const query = `
        SELECT ct.*, u.login AS created_by_name FROM ${tbl.kContractType}  ct
        LEFT JOIN ${tbl.kUsers} u ON ct.created_by = u.id
        WHERE ct.is_deleted = $1
        ORDER BY name ASC
      `;
            const rows = await pgdb_1.default.manyOrNone(query, [includeDeleted]);
            return {
                status: true,
                code: 200,
                message: 'ContractTypes retrieved',
                body: rows,
            };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Error retrieving contract types',
                exception: error,
                body: [],
            };
        }
    }
    // FIND BY ID
    static async findById(id, includeDeleted) {
        try {
            const query = `
        SELECT * FROM ${tbl.kContractType}
        WHERE id = $1 AND is_deleted = $2
      `;
            const result = await pgdb_1.default.oneOrNone(query, [id, includeDeleted]);
            if (!result) {
                return { status: false, code: 404, message: 'Not found', body: {} };
            }
            return { status: true, code: 200, message: 'Found', body: result };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Error retrieving contract type',
                exception: error,
                body: {},
            };
        }
    }
    // UPDATE
    static async update(id, data) {
        try {
            const { id: _, ...updateData } = data;
            const keys = Object.keys(updateData);
            const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
            const query = `
        UPDATE ${tbl.kContractType}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_deleted = FALSE
        RETURNING *
      `;
            const values = [id, ...Object.values(updateData)];
            const updated = await pgdb_1.default.oneOrNone(query, values);
            if (!updated) {
                return { status: false, code: 404, message: 'Not found or deleted', body: {} };
            }
            return { status: true, code: 200, message: 'Updated', body: updated };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Error updating',
                exception: error,
                body: {},
            };
        }
    }
    // SOFT DELETE
    static async softDelete(id, userId) {
        try {
            const query = `
        UPDATE ${tbl.kContractType}
        SET is_deleted = TRUE,
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
            const deleted = await pgdb_1.default.oneOrNone(query, [id, userId]);
            if (!deleted) {
                return { status: false, code: 404, message: 'Not found', body: {} };
            }
            return { status: true, code: 200, message: 'Soft deleted', body: deleted };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Error soft deleting',
                exception: error,
                body: {},
            };
        }
    }
    // RESTORE
    static async restore(id) {
        try {
            const query = `
        UPDATE ${tbl.kContractType}
        SET is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_deleted = TRUE
        RETURNING *
      `;
            const restored = await pgdb_1.default.oneOrNone(query, [id]);
            if (!restored) {
                return { status: false, code: 404, message: 'Not found or not deleted', body: {} };
            }
            return { status: true, code: 200, message: 'Restored', body: restored };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Error restoring',
                exception: error,
                body: {},
            };
        }
    }
    // DELETE   
    static async delete(id) {
        try {
            const query = `
                DELETE FROM ${tbl.kContractType}
                WHERE id = $1
                RETURNING *
            `;
            const deleted = await pgdb_1.default.oneOrNone(query, [id]);
            if (!deleted) {
                return { status: false, code: 404, message: 'Not found', body: {} };
            }
            return { status: true, code: 200, message: 'Deleted', body: deleted };
        }
        catch (error) {
            return {
                status: false,
                code: 500,
                message: error instanceof Error ? error.message : 'Error deleting',
                exception: error,
                body: {},
            };
        }
    }
}
exports.ContractTypeRepository = ContractTypeRepository;
