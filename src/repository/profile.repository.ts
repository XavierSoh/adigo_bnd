// Migrated to Prisma's native model API (prisma.profile.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
// tier 4). The original's `.tx(...).catch(...)` chain mutating an outer,
// uninitialized `responseModel` variable is modernized to plain
// try/catch here — same success/error responses (including each
// method's own distinct status code on failure, preserved exactly),
// just consistent with every other repository in this migration.
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { ProfileModel } from "../models/profile.model";
import ResponseModel from "../models/response.model";

const accessRightSelect = {
    id: true, key: true, module: true, module_name_en: true, module_name_fr: true,
    description_en: true, description_fr: true,
} satisfies Prisma.access_rightSelect;

export default class ProfileRepository {

    static async getAllProfiles(is_deleted: boolean): Promise<ResponseModel> {
        try {
            // Starts FROM profile (not profile_access_rights) so a profile
            // with zero granted access rights still shows up in the list,
            // with an empty access_rights array, instead of silently
            // disappearing — `include` on a to-many relation naturally
            // returns an empty array for that case, same guarantee.
            const profiles = await prismaDb.profile.findMany({
                where: { is_deleted },
                include: { profile_access_rights: { include: { access_right: { select: accessRightSelect } } } },
                orderBy: { id: 'asc' },
            });

            const body = profiles.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                // The junction row's OWN soft-delete fields
                // (is_deleted/deleted_at/deleted_by) are what the original
                // attached to each access-right entry here — not
                // access_right's own is_deleted — preserved exactly.
                access_rights: p.profile_access_rights.map((par) => ({
                    ...par.access_right,
                    is_deleted: par.is_deleted,
                    deleted_at: par.deleted_at,
                    deleted_by: par.deleted_by,
                })),
            }));

            return { status: true, message: "Profiles retrieved successfully", body, code: 200 };
        } catch (e) {
            return {
                status: false,
                message: e instanceof Error ? `Error retrieving profiles: ${e.message}` : "Unknown error",
                body: null,
                code: 500,
                exception: e instanceof Error ? e.stack : undefined
            };
        }
    }

    /// Récupère un seul profil (avec ses droits d'accès) par son id.
    /// Utilisé notamment juste après le login pour charger les droits de
    /// l'utilisateur connecté (voir AuthenticationViewmodel.login côté Flutter).
    static async getProfileById(profileId: number): Promise<ResponseModel> {
        try {
            const p = await prismaDb.profile.findUnique({
                where: { id: profileId },
                include: { profile_access_rights: { include: { access_right: { select: accessRightSelect } } } },
            });

            if (!p) {
                return { status: false, message: "Profile not found", body: null, code: 404 };
            }

            // Unlike getAllProfiles above, this shape is JUST the
            // access_right's own fields — no junction-row soft-delete
            // fields mixed in (matches the original's narrower SELECT
            // list here, a deliberately different shape from the other
            // method).
            const profile = {
                id: p.id,
                name: p.name,
                description: p.description,
                access_rights: p.profile_access_rights.map((par) => par.access_right),
            };

            return { status: true, message: "Profile retrieved successfully", body: profile, code: 200 };
        } catch (e) {
            return {
                status: false,
                message: e instanceof Error ? `Error retrieving profile: ${e.message}` : "Unknown error",
                body: null,
                code: 500,
                exception: e instanceof Error ? e.stack : undefined
            };
        }
    }

    static async createProfile(profile: ProfileModel): Promise<ResponseModel> {
        try {
            const { name, description, access_rights } = profile;

            if (!name) {
                throw new Error('Name is required in a valid format (string) for profile creation');
            }

            const returningProfile = await prismaDb.$transaction(async (tx) => {
                const created = await tx.profile.create({ data: { name, description: description || '' } });

                if (access_rights) {
                    for (const access_right of access_rights) {
                        if (access_right.id) {
                            await tx.profile_access_rights.create({
                                data: { profile_id: created.id, access_right_id: access_right.id },
                            });
                        }
                    }
                } else {
                    throw new Error('Profile ID OR  ACCESS RIGHT UNDEFINED');
                }

                return created;
            });

            return { status: true, message: "Profile created successfully", body: returningProfile, code: 201 };
        } catch (error) {
            console.error(error);
            return {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while creating the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined
            };
        }
    }

    static async updateProfile(profileModel: ProfileModel): Promise<ResponseModel> {
        try {
            const { name, description, access_rights, is_deleted, deleted_by } = profileModel;
            const profileId = profileModel.id;

            const existingProfile = await prismaDb.profile.findUnique({ where: { id: profileId } });
            if (!existingProfile) {
                throw new Error('Profile not found');
            }

            await prismaDb.$transaction(async (tx) => {
                const data: Prisma.profileUncheckedUpdateInput = {};
                if (name != null) data.name = name;
                data.description = description || '';
                if (is_deleted != null) data.is_deleted = is_deleted;
                if (deleted_by != null) data.deleted_by = deleted_by;

                await tx.profile.update({ where: { id: profileId }, data });

                // Ajouter les nouveaux droits d'accès
                if (Array.isArray(access_rights) && access_rights.length > 0) {
                    // Supprimer les droits d'accès existants associés à ce profil
                    await tx.profile_access_rights.deleteMany({ where: { profile_id: profileId } });
                    for (const access_right of access_rights) {
                        if (access_right.id) {
                            await tx.profile_access_rights.create({
                                data: { profile_id: profileId, access_right_id: access_right.id },
                            });
                        }
                    }
                }
            });

            return {
                code: 200,
                status: true,
                message: 'Profile updated successfully',
                body: {
                    id: profileId,
                    name: name || existingProfile.name,
                    description: description || existingProfile.description,
                    access_rights: access_rights || [],
                    status: true,
                }
            };
        } catch (error) {
            console.error(error);
            return {
                code: 400,
                body: null,
                message: error instanceof Error ? error.message : "An error occurred while updating the profile.",
                exception: error instanceof Error ? error.stack : undefined,
                status: false
            };
        }
    }

    static async softDeleteProfile(profileId: number, userId: number): Promise<ResponseModel> {
        try {
            const profileExists = await prismaDb.profile.findUnique({ where: { id: profileId } });
            if (!profileExists) {
                throw new Error(`Profile with id ${profileId} not found`);
            }

            await prismaDb.profile.update({
                where: { id: profileId },
                data: { is_deleted: true, deleted_at: new Date(), deleted_by: userId },
            });

            return { status: true, message: "Profile soft-deleted successfully", body: null, code: 200 };
        } catch (error) {
            console.error(error);
            return {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while soft-deleting the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined,
            };
        }
    }

    static async restoreProfile(profileId: number, userId: number): Promise<ResponseModel> {
        try {
            const profileExists = await prismaDb.profile.findUnique({ where: { id: profileId } });
            if (!profileExists) {
                throw new Error(`Profile with id ${profileId} not found`);
            }
            if (!profileExists.is_deleted) {
                throw new Error(`Profile with id ${profileId} is not deleted`);
            }

            await prismaDb.profile.update({
                where: { id: profileId },
                data: { is_deleted: false, deleted_at: null, deleted_by: null },
            });

            return { status: true, message: "Profile restored successfully", body: null, code: 200 };
        } catch (error) {
            console.error(error);
            return {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while restoring the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined,
            };
        }
    }

    static async deleteProfile(profileId: number): Promise<ResponseModel> {
        try {
            const profileExists = await prismaDb.profile.findUnique({ where: { id: profileId } });
            if (!profileExists) {
                throw new Error(`Profile with id ${profileId} not found`);
            }

            await prismaDb.$transaction(async (tx) => {
                // Supprimer d'abord les relations dans la table intermédiaire
                await tx.profile_access_rights.deleteMany({ where: { profile_id: profileId } });
                // Supprimer le profil lui-même
                await tx.profile.delete({ where: { id: profileId } });
            });

            return { status: true, message: "Profile permanently deleted successfully", body: null, code: 200 };
        } catch (error) {
            console.error(error);
            return {
                status: false,
                message: error instanceof Error ? error.message : "An error occurred while deleting the profile.",
                body: null,
                code: 500,
                exception: error instanceof Error ? error.stack : undefined,
            };
        }
    }

}
