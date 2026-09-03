// Migrated to Prisma's native model API (prisma.contract_type.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from '@prisma/client';
import prismaDb from '../config/prismaClient';
import { ContractTypeModel } from '../models/contract_type.model';
import ResponseModel from '../models/response.model';

export class ContractTypeRepository {
  // CREATE
  static async create(data: Partial<ContractTypeModel>): Promise<ResponseModel> {
    try {
      const { id, ...createData } = data;
      const created = await prismaDb.contract_type.create({ data: createData as any });

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
      // AMBIGUOUS CASE, flagged not guessed: `contract_type.created_by` has
      // no FK constraint in the DB, so Prisma's introspection never
      // generated a `@relation` to `users` for it — `include` can't
      // traverse this join at all. Reconstructed with a second batched
      // query (no N+1: one `users.findMany({where:{id:{in:[...]}}})` for
      // every distinct created_by across the page) instead of the original
      // single SQL LEFT JOIN.
      const rows = await prismaDb.contract_type.findMany({
        where: { is_deleted: includeDeleted },
        orderBy: { name: 'asc' },
      });
      const creatorIds = [...new Set(rows.map((r) => r.created_by).filter((v): v is number => v != null))];
      const creators = creatorIds.length
        ? await prismaDb.users.findMany({ where: { id: { in: creatorIds } }, select: { id: true, login: true } })
        : [];
      const loginById = new Map(creators.map((u) => [u.id, u.login]));
      const body = rows.map((ct) => ({
        ...ct,
        created_by_name: ct.created_by != null ? loginById.get(ct.created_by) ?? null : null,
      }));

      return {
        status: true,
        code: 200,
        message: 'ContractTypes retrieved',
        body,
      };
    } catch (error) {
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
  static async findById(id: number, includeDeleted: boolean): Promise<ResponseModel> {
    try {
      const result = await prismaDb.contract_type.findFirst({
        where: { id, is_deleted: includeDeleted },
      });

      if (!result) {
        return { status: false, code: 404, message: 'Not found', body: {} };
      }

      return { status: true, code: 200, message: 'Found', body: result };
    } catch (error) {
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
  static async update(id: number, data: Partial<ContractTypeModel>): Promise<ResponseModel> {
    try {
      const { id: _, ...updateData } = data;

      const result = await prismaDb.contract_type.updateMany({
        where: { id, is_deleted: false },
        data: { ...(updateData as any), updated_at: new Date() },
      });

      if (result.count === 0) {
        return { status: false, code: 404, message: 'Not found or deleted', body: {} };
      }
      const updated = await prismaDb.contract_type.findUnique({ where: { id } });

      return { status: true, code: 200, message: 'Updated', body: updated };
    } catch (error) {
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
  static async softDelete(id: number, userId: number): Promise<ResponseModel> {
    try {
      // Original had no `WHERE ... AND is_deleted = FALSE` guard (unlike
      // most other repositories' softDelete) — preserved as-is, not added.
      const result = await prismaDb.contract_type.updateMany({
        where: { id },
        data: { is_deleted: true, deleted_at: new Date(), deleted_by: userId, updated_at: new Date() },
      });

      if (result.count === 0) {
        return { status: false, code: 404, message: 'Not found', body: {} };
      }
      const deleted = await prismaDb.contract_type.findUnique({ where: { id } });

      return { status: true, code: 200, message: 'Soft deleted', body: deleted };
    } catch (error) {
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
  static async restore(id: number): Promise<ResponseModel> {
    try {
      const result = await prismaDb.contract_type.updateMany({
        where: { id, is_deleted: true },
        data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_at: new Date() },
      });

      if (result.count === 0) {
        return { status: false, code: 404, message: 'Not found or not deleted', body: {} };
      }
      const restored = await prismaDb.contract_type.findUnique({ where: { id } });

      return { status: true, code: 200, message: 'Restored', body: restored };
    } catch (error) {
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
  static async delete(id: number): Promise<ResponseModel> {
    try {
      const deleted = await prismaDb.contract_type.delete({ where: { id } });
      return { status: true, code: 200, message: 'Deleted', body: deleted };
    } catch (error) {
      // P2025 = "record to delete does not exist" — Prisma's equivalent of
      // the original DELETE...RETURNING* coming back with 0 rows (null via
      // oneOrNone), which the old code mapped to 404, not 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return { status: false, code: 404, message: 'Not found', body: {} };
      }
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
