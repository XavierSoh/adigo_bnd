// Migrated to Prisma's native model API (prisma.agency.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { AgencyModel } from "../models/agency.model";
import ResponseModel from "../models/response.model";

export class AgencyRepository {

    static async create(agency: AgencyModel): Promise<ResponseModel> {
        try {
            const result = await prismaDb.agency.create({
                data: {
                    name: agency.name,
                    address: agency.address,
                    cities_served: agency.cities_served,
                    phone: agency.phone || null,
                    email: agency.email || null,
                    logo: agency.logo || null,
                    latitude: agency.latitude ?? null,
                    longitude: agency.longitude ?? null,
                    opening_hours: agency.opening_hours,
                    // `custom_hours` is a native Json column — pass the
                    // object directly (Prisma serializes it), not a
                    // pre-stringified string like the raw-SQL `::jsonb`
                    // cast needed.
                    custom_hours: agency.custom_hours ?? undefined,
                    created_by: agency.created_by,
                },
            });

            return {
                status: true,
                message: 'Agence créée avec succès',
                body: result,
                code: 201
            };
        } catch (error) {
            console.log(`Agency create error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: 'Erreur lors de la création',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    static async update(id: number, agencyData: Partial<AgencyModel>): Promise<ResponseModel> {
        try {
            const updates: Record<string, any> = { ...agencyData };

            delete updates.id;
            delete updates.created_by;
            delete updates.is_deleted;
            delete updates.deleted_at;
            delete updates.deleted_by;

            if (updates.logo === null || updates.logo === undefined || updates.logo === '') {
                delete updates.logo;
            }
            if (updates.email === null || updates.email === undefined || updates.email === '') {
                delete updates.email;
            }

            if ('custom_hours' in updates) {
                if (updates.custom_hours === null || updates.custom_hours === undefined) {
                    delete updates.custom_hours;
                } else if (typeof updates.custom_hours === 'string') {
                    if (updates.custom_hours.trim() === '') {
                        delete updates.custom_hours;
                    } else {
                        // Was a raw string cast via `::jsonb` before — Prisma's
                        // Json field needs an actual JS value, not a JSON-text
                        // string (else it'd store a jsonb *string scalar*
                        // containing that text, not the parsed object).
                        updates.custom_hours = JSON.parse(updates.custom_hours);
                    }
                }
                // else: already an object — pass through as-is for Prisma's Json field.
            }

            if (Object.keys(updates).length === 0) {
                return {
                    status: false,
                    message: "Aucune donnée valide à mettre à jour",
                    code: 400
                };
            }

            const result = await prismaDb.agency.updateMany({
                where: { id, is_deleted: false },
                data: updates as Prisma.agencyUncheckedUpdateInput,
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "Agence non trouvée ou déjà supprimée",
                    code: 404
                };
            }
            const updatedAgency = await prismaDb.agency.findUnique({ where: { id } });

            return {
                status: true,
                message: "Agence mise à jour",
                body: updatedAgency,
                code: 200
            };
        } catch (error) {
            console.log(`Agency update error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: "Erreur de mise à jour",
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    static async findAll(includeDeleted = false): Promise<ResponseModel> {
        try {
            const agencies = await prismaDb.agency.findMany({
                where: { is_deleted: includeDeleted },
                orderBy: { name: 'asc' },
            });
            return {
                status: true,
                message: 'Agences récupérées',
                body: agencies,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: 'Erreur de récupération',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    static async findById(id: number, includeDeleted = false): Promise<ResponseModel> {
        try {
            const agency = await prismaDb.agency.findFirst({
                where: includeDeleted ? { id } : { id, is_deleted: false },
            });

            if (!agency) {
                return {
                    status: false,
                    message: 'Agence non trouvée',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Agence récupérée',
                body: agency,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: 'Erreur de récupération',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    static async softDelete(id: number, deletedBy: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.agency.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "Agence non trouvée ou déjà supprimée",
                    code: 404
                };
            }
            const body = await prismaDb.agency.findUnique({ where: { id }, select: { id: true, name: true } });

            return {
                status: true,
                message: "Agence supprimée (soft delete)",
                body,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Erreur lors de la suppression",
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.agency.delete({ where: { id }, select: { id: true, name: true } });

            return {
                status: true,
                message: "Agence supprimée définitivement",
                body: result,
                code: 200
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Agence non trouvée", code: 404 };
            }
            return {
                status: false,
                message: "Erreur lors de la suppression",
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.agency.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null, deleted_by: null },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "Agence non trouvée ou non supprimée",
                    code: 404
                };
            }
            const body = await prismaDb.agency.findUnique({ where: { id }, select: { id: true, name: true } });

            return {
                status: true,
                message: "Agence restaurée",
                body,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Erreur lors de la restauration",
                exception: error instanceof Error ? error.message : error,
                code: 500,
                body: null
            };
        }
    }

    static async bulkCreate(agencies: AgencyModel[]): Promise<ResponseModel> {
        try {
            if (!agencies.length) {
                return {
                    status: false,
                    message: "Aucune agence à créer",
                    code: 400
                };
            }

            // AMBIGUOUS CASE, flagged not guessed: `createMany()` doesn't
            // return created rows, and `agency` has no unique column to
            // re-query by afterwards (unlike bus's registration_number).
            // Individual `create()` calls inside `$transaction([...])`
            // preserve the original single-round-trip-worth of atomicity
            // (all-or-nothing) while still getting each row (with its
            // generated id) back, at the cost of N statements instead of 1.
            const result = await prismaDb.$transaction(
                agencies.map((agency) =>
                    prismaDb.agency.create({
                        data: {
                            name: agency.name,
                            address: agency.address,
                            cities_served: agency.cities_served,
                            phone: agency.phone,
                            email: agency.email,
                            logo: agency.logo,
                            opening_hours: agency.opening_hours,
                            custom_hours: agency.custom_hours ?? undefined,
                            created_by: agency.created_by,
                        },
                    })
                )
            );

            return {
                status: true,
                message: "Agences créées avec succès",
                body: result,
                code: 201
            };

        } catch (error) {
            return {
                status: false,
                message: "Erreur lors de la création en masse",
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }


}
