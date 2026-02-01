import pgdb from '../config/pgdb';
import { ContractTypeModel } from '../models/contract_type.model';
import ResponseModel from '../models/response.model'; 
import * as tbl from '../utils/table_names';

export class ContractTypeRepository {
  // CREATE
  static async create(data: Partial<ContractTypeModel>): Promise<ResponseModel> {
    try { 
      delete data.id;     
      const keys = Object.keys(data);
      const values = keys.map((k) => data[k as keyof typeof data]);
      const placeholders = keys.map((_, i) => `$${i + 1}`);

      const query = `
        INSERT INTO ${tbl.kContractType} (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const created = await pgdb.one(query, values);

      return {
        status: true,
        code: 201,
        message: 'ContractType created',
        body: created,
      };
    } catch (error) {
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
  static async findAll(includeDeleted = false): Promise<ResponseModel> {
    try {
      const query = `
        SELECT ct.*, u.login AS created_by_name FROM ${tbl.kContractType}  ct
        LEFT JOIN ${tbl.kUsers} u ON ct.created_by = u.id
        WHERE ct.is_deleted = $1
        ORDER BY name ASC
      `;

      const rows = await pgdb.manyOrNone(query, [includeDeleted]);

      return {
        status: true,
        code: 200,
        message: 'ContractTypes retrieved',
        body: rows,
      };
    } catch (error) {
      return {
        status: false,
        code: 500,
        message:error instanceof Error?error.message: 'Error retrieving contract types',
        exception: error,
        body: [],
      };
    }
  }

  // FIND BY ID
  static async findById(id: number, includeDeleted:boolean): Promise<ResponseModel> {
    try {
      const query = `
        SELECT * FROM ${tbl.kContractType}
        WHERE id = $1 AND is_deleted = $2
      `;

      const result = await pgdb.oneOrNone(query, [id, includeDeleted]);

      if (!result) {
        return { status: false, code: 404, message: 'Not found', body: {} };
      }

      return { status: true, code: 200, message: 'Found', body: result };
    } catch (error) {
      return {
        status: false,
        code: 500,
        message: error instanceof Error?error.message:'Error retrieving contract type',
        exception: error,
        body: {},
      };
    }
  }

  // UPDATE
  static async update(id: number, data: Partial<ContractTypeModel>): Promise<ResponseModel> {
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

      const updated = await pgdb.oneOrNone(query, values);

      if (!updated) {
        return { status: false, code: 404, message: 'Not found or deleted', body: {} };
      }

      return { status: true, code: 200, message: 'Updated', body: updated };
    } catch (error) {
      return {
        status: false,
        code: 500,
        message:error instanceof Error?error.message: 'Error updating',
        exception: error,
        body: {},
      };
    }
  }

  // SOFT DELETE
  static async softDelete(id: number, userId: number): Promise<ResponseModel> {
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

      const deleted = await pgdb.oneOrNone(query, [id, userId]);

      if (!deleted) {
        return { status: false, code: 404, message: 'Not found', body: {} };
      }

      return { status: true, code: 200, message: 'Soft deleted', body: deleted };
    } catch (error) {
      return {
        status: false,
        code: 500,
        message: error instanceof Error?error.message:'Error soft deleting',
        exception: error,
        body: {},
      };
    }
  }

  // RESTORE
  static async restore(id: number): Promise<ResponseModel> {
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

      const restored = await pgdb.oneOrNone(query, [id]);

      if (!restored) {
        return { status: false, code: 404, message: 'Not found or not deleted', body: {} };
      }

      return { status: true, code: 200, message: 'Restored', body: restored };
    } catch (error) {
      return {
        status: false,
        code: 500,
        message:error instanceof Error?error.message: 'Error restoring',
        exception: error,
        body: {},
      };
    }
  }

    // DELETE   
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const query = `
                DELETE FROM ${tbl.kContractType}
                WHERE id = $1
                RETURNING *
            `;

            const deleted = await pgdb.oneOrNone(query, [id]);

            if (!deleted) {
                return { status: false, code: 404, message: 'Not found', body: {} };
            }

            return { status: true, code: 200, message: 'Deleted', body: deleted };
        } catch (error) {
            return {
                status: false,
                code: 500,
                message:error instanceof Error?error.message: 'Error deleting',
                exception: error,
                body: {},
            };
        }
    }
}
