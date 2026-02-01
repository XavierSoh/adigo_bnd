import pgpDb from "../config/pgdb";
import { ProfileModel } from "../models/profile.model";
import ResponseModel from "../models/response.model";
import * as tbl from "../utils/table_names";
export default class ProfileRepository{

 static async getAllProfiles(is_deleted: boolean): Promise<ResponseModel> {
  try {

   
    const response = await pgpDb.tx(async (tx) => {
      const query = `
        SELECT 
          par.profile_id,
          p.name AS profile_name,
          p.description AS profile_description,
          a.id AS access_right_id,
          a.key,
          a.module,
          a.module_name_en,
          a.module_name_fr,
          a.description_en,
          a.description_fr,
          par.is_deleted,
          par.deleted_at,
          par.deleted_by
        FROM ${tbl.kProfileAccessRights} par
        LEFT JOIN ${tbl.kProfile} p ON p.id = par.profile_id
        LEFT JOIN ${tbl.kAccessRight} a ON a.id = par.access_right_id
        WHERE p.is_deleted = $1
        ORDER BY par.profile_id
      `;

      const rows = await tx.manyOrNone(query, [is_deleted]);

      // Utilisation d'une Map pour éviter les .find() dans un tableau
      const profileMap = new Map<number, any>();

      for (const row of rows) {
        if (!profileMap.has(row.profile_id)) {
          profileMap.set(row.profile_id, {
            id: row.profile_id,
            name: row.profile_name,
            description: row.profile_description,
            access_rights: [],
          });
        }

        // Ajoute le droit d'accès
        profileMap.get(row.profile_id).access_rights.push({
          id: row.access_right_id,
          key: row.key,
          module: row.module,
          module_name_en: row.module_name_en,
          module_name_fr: row.module_name_fr,
          description_en: row.description_en,
          description_fr: row.description_fr,
          is_deleted: row.is_deleted,
          deleted_at: row.deleted_at,
          deleted_by: row.deleted_by,
        });
      }

      return Array.from(profileMap.values());
    });

    return {
      status: true,
      message: "Profiles retrieved successfully",
      body: response,
      code: 200
    };
  } catch (e) {
    return {
      status: false,
      message:
        e instanceof Error
          ? `Error retrieving profiles: ${e.message}`
          : "Unknown error",
      body: null,
      code: 500,
      exception: e instanceof Error ? e.stack : undefined
    };
  }
}

static async createProfile(profile: ProfileModel): Promise<ResponseModel> {
    let responseModel: ResponseModel ;
       await pgpDb.tx(async (tx) => {
        const { name, description, access_rights } = profile;
        let returningProfile:ProfileModel | null = null;
        console.log('ProfileRepository.createProfile', profile);
        
        if (name) {
            returningProfile = await tx.one(`INSERT INTO ${tbl.kProfile} (name, description) VALUES($1, $2) RETURNING *`, [name, description || ''])
            console.log('Profile ID AS ARRAY', returningProfile);
            if (returningProfile) {
                let profileID = returningProfile;
     
                if (profileID && profileID['id'] && access_rights) {
                    const profileIDReal = profileID['id'];
                    for (let access_right of access_rights) {
               
                        const { id } = access_right;
                        if (id) {
                        await tx.none(`INSERT INTO ${tbl.kProfileAccessRights} (profile_id, access_right_id) VALUES ($1, $2)`, [profileIDReal, id])
                        }
                    }
 
                } else {
                    throw Error('Profile ID OR  ACCESS RIGHT UNDEFINED')
                }
            } else {
                throw Error('Profile ID AS ARRAY NULL')
            }

            console.log('ProfileRepository.createProfile returningProfile', returningProfile);

        

         responseModel = {
            status: true,       
            message: "Profile created successfully",
            body: returningProfile,
            code: 201
        };
    } else {
            throw Error('Name is required in a valid format (string) for profile creation');
        }
 
    }).catch((error) => {
        console.error(error)
         responseModel = {
            status: false,  
            message: error instanceof Error ? error.message : "An error occurred while creating the profile.",
            body: null,
            code: 500,
            exception: error instanceof Error ? error.stack : undefined
        };
    });

    return responseModel
}


static async updateProfile( profileModel: ProfileModel): Promise<ResponseModel> {
  let responseModel:ResponseModel;
  await pgpDb
      .tx(async (tx) => {
       
        
        
        const { name, description, access_rights, is_deleted, deleted_by} = profileModel;
        console.log(`Profile model `, profileModel);
        const { id } = profileModel;
        const profileId = id;
        // Vérifier si le profil existe
        const existingProfile = await tx.oneOrNone(`SELECT id FROM ${tbl.kProfile} WHERE id = $1`, [profileId]);
        if (!existingProfile) {
          throw new Error('Profile not found');
        }
  
        // Mettre à jour les informations du profil
        await tx.none(
          `UPDATE ${tbl.kProfile} 
           SET name = COALESCE($1, name), description = COALESCE($2, description),  is_deleted = COALESCE($3, is_deleted), deleted_by = COALESCE($4, deleted_by) WHERE id = $5`,
          [name, description || '',  is_deleted, deleted_by, profileId]
        );
  
        
  
        // Ajouter les nouveaux droits d'accès
        if (Array.isArray(access_rights) && access_rights.length > 0) {
          // Supprimer les droits d'accès existants associés à ce profil
        await tx.none(`DELETE FROM ${tbl.kProfileAccessRights} WHERE profile_id = $1`, [profileId]);
          for (const access_right of access_rights) {
            const { id: accessRightId } = access_right;
            if (accessRightId) {
              await tx.none(
                `INSERT INTO ${tbl.kProfileAccessRights} (profile_id, access_right_id) VALUES ($1, $2)`,
                [profileId, accessRightId]
              );
            }
          }
        }
  
         responseModel={
          code:200, 
          status: true,
          message: 'Profile updated successfully',
          body: {
            id: profileId,
            name: name || existingProfile.name,
            description: description || existingProfile.description,
            access_rights: access_rights || [],
            status:true,
          }
        }
      
        return responseModel;
      })
      .catch((error) => {
        console.error(error);
         responseModel={
          code:400, 
          body:null, 
          message:error instanceof Error?error.message: "An error occurred while updating the profile.",
          exception:error instanceof Error ? error.stack : undefined,
          status:false
        }
       
       
      });
  return responseModel;
     
  };

static async softDeleteProfile(profileId: number, userId: number): Promise<ResponseModel> {
  let responseModel: ResponseModel;

  await pgpDb.tx(async (tx) => {
    const profileExists = await tx.oneOrNone(`SELECT * FROM ${tbl.kProfile} WHERE id = $1`, [profileId]);

    if (!profileExists) {
      throw new Error(`Profile with id ${profileId} not found`);
    }

    await tx.none(`
      UPDATE ${tbl.kProfile}
      SET is_deleted = TRUE,
          deleted_at = NOW(),
          deleted_by = $1
      WHERE id = $2
    `, [userId, profileId]);

    responseModel = {
      status: true,
      message: "Profile soft-deleted successfully",
      body: null,
      code: 200,
    };
  }).catch((error) => {
    console.error(error);
    responseModel = {
      status: false,
      message: error instanceof Error ? error.message : "An error occurred while soft-deleting the profile.",
      body: null,
      code: 500,
      exception: error instanceof Error ? error.stack : undefined,
    };
  });

  return responseModel;
}

static async restoreProfile(profileId: number, userId: number): Promise<ResponseModel> {
  let responseModel: ResponseModel;

  await pgpDb.tx(async (tx) => {
    const profileExists = await tx.oneOrNone(`SELECT * FROM ${tbl.kProfile} WHERE id = $1`, [profileId]);

    if (!profileExists) {
      throw new Error(`Profile with id ${profileId} not found`);
    }

    if (!profileExists.is_deleted) {
      throw new Error(`Profile with id ${profileId} is not deleted`);
    }

    await tx.none(`
      UPDATE ${tbl.kProfile}
      SET is_deleted = FALSE,
          deleted_at = NULL,
          deleted_by = NULL
      WHERE id = $1
    `, [profileId]);

    responseModel = {
      status: true,
      message: "Profile restored successfully",
      body: null,
      code: 200,
    };
  }).catch((error) => {
    console.error(error);
    responseModel = {
      status: false,
      message: error instanceof Error ? error.message : "An error occurred while restoring the profile.",
      body: null,
      code: 500,
      exception: error instanceof Error ? error.stack : undefined,
    };
  });

  return responseModel;
}

static async deleteProfile(profileId: number): Promise<ResponseModel> {
  let responseModel: ResponseModel;

  await pgpDb.tx(async (tx) => {
    const profileExists = await tx.oneOrNone(`SELECT * FROM ${tbl.kProfile} WHERE id = $1`, [profileId]);

    if (!profileExists) {
      throw new Error(`Profile with id ${profileId} not found`);
    }

    // Supprimer d'abord les relations dans la table intermédiaire
    await tx.none(`DELETE FROM ${tbl.kProfileAccessRights} WHERE profile_id = $1`, [profileId]);

    // Supprimer le profil lui-même
    await tx.none(`DELETE FROM ${tbl.kProfile} WHERE id = $1`, [profileId]);

    responseModel = {
      status: true,
      message: "Profile permanently deleted successfully",
      body: null,
      code: 200,
    };
  }).catch((error) => {
    console.error(error);
    responseModel = {
      status: false,
      message: error instanceof Error ? error.message : "An error occurred while deleting the profile.",
      body: null,
      code: 500,
      exception: error instanceof Error ? error.stack : undefined,
    };
  });

  return responseModel;
}


}

