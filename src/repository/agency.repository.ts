 
import pgpDb from "../config/pgdb";
import { AgencyModel } from "../models/agency.model";
import ResponseModel from "../models/response.model";
import { kAgency } from "../utils/table_names";

 
export class AgencyRepository {
    
    static async create(agency: AgencyModel): Promise<ResponseModel> {
        try {
            // Nettoyer et formater custom_hours
            let customHours: string | null = null;
            
            if (agency.custom_hours) {
                customHours = JSON.stringify(agency.custom_hours);
            }

            const result = await pgpDb.oneOrNone(
                `INSERT INTO ${kAgency} (
                    name, address, cities_served, phone, email, 
                    logo, opening_hours, custom_hours, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
                RETURNING *`,
                [
                    agency.name,
                    agency.address,
                    agency.cities_served,
                    agency.phone || null,
                    agency.email || null,
                    agency.logo || null,
                    agency.opening_hours,
                    customHours,
                    agency.created_by
                ]
            );

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
            // Créer une copie pour manipulation
            const updates: Record<string, any> = { ...agencyData };
            
            // Exclure les champs non modifiables
            delete updates.id;
            delete updates.created_by;
            delete updates.is_deleted;
            delete updates.deleted_at;
            delete updates.deleted_by;

            // Nettoyer les valeurs vides pour les champs optionnels
            if (updates.logo === null || updates.logo === undefined || updates.logo === '') {
                delete updates.logo;
            }
            if (updates.email === null || updates.email === undefined || updates.email === '') {
                delete updates.email;
            }

            // Traiter custom_hours
            if ('custom_hours' in updates) {
                if (updates.custom_hours === null || updates.custom_hours === undefined) {
                    delete updates.custom_hours;
                } else if (typeof updates.custom_hours === 'string') {
                    // Si c'est une chaîne vide, on la supprime
                    if (updates.custom_hours.trim() === '') {
                        delete updates.custom_hours;
                    }
                    // Sinon on garde la chaîne (doit être du JSON valide)
                } else {
                    // Si c'est un objet, le convertir en JSON
                    updates.custom_hours = JSON.stringify(updates.custom_hours);
                }
            }

            if (Object.keys(updates).length === 0) {
                return {
                    status: false,
                    message: "Aucune donnée valide à mettre à jour",
                    code: 400
                };
            }

            // Construire la requête dynamiquement
            const setClauses: string[] = [];
            const params: any[] = [id];
            let paramIndex = 2;

            for (const [key, value] of Object.entries(updates)) {
                if (key === 'custom_hours') {
                    setClauses.push(`${key} = $${paramIndex}::jsonb`);
                } else if (key === 'cities_served') {
                    setClauses.push(`${key} = $${paramIndex}::text[]`);
                } else {
                    setClauses.push(`${key} = $${paramIndex}`);
                }
                params.push(value);
                paramIndex++;
            }

            const query = `
                UPDATE ${kAgency}
                SET ${setClauses.join(', ')}
                WHERE id = $1 AND is_deleted = false
                RETURNING *
            `;

            const updatedAgency = await pgpDb.oneOrNone(query, params);

            if (!updatedAgency) {
                return {
                    status: false,
                    message: "Agence non trouvée ou déjà supprimée",
                    code: 404
                };
            }

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
            let query = `SELECT * FROM ${kAgency} `;
             query += ` WHERE is_deleted = ${includeDeleted}`;
            
            query += " ORDER BY name ASC"; // Optionnel : trier par nom
            const agencies = await pgpDb.manyOrNone(query);
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
            let query = `SELECT * FROM ${kAgency} WHERE id = $1`;
            if (!includeDeleted) query += " AND is_deleted = false";
            
            const agency = await pgpDb.oneOrNone(query, [id]);
            
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
            const query = `
                UPDATE ${kAgency}
                SET is_deleted = true, 
                    deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = $2
                WHERE id = $1 AND is_deleted = false
                RETURNING id, name
            `;
            
            const result = await pgpDb.oneOrNone(query, [id, deletedBy]);

            if (!result) {
                return {
                    status: false,
                    message: "Agence non trouvée ou déjà supprimée",
                    code: 404
                };
            }

            return {
                status: true,
                message: "Agence supprimée (soft delete)",
                body: result,
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
            const query = `
                DELETE FROM ${kAgency}
                WHERE id = $1
                RETURNING id, name
            `;
            
            const result = await pgpDb.oneOrNone(query, [id]);

            if (!result) {
                return {
                    status: false,
                    message: "Agence non trouvée",
                    code: 404
                };
            }

            return {
                status: true,
                message: "Agence supprimée définitivement",
                body: result,
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

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const query = `
                UPDATE ${kAgency}
                SET is_deleted = false,
                    deleted_at = NULL,
                    deleted_by = NULL
                WHERE id = $1 AND is_deleted = true
                RETURNING id, name
            `;
            
            const result = await pgpDb.oneOrNone(query, [id]);

            if (!result) {
                return {
                    status: false,
                    message: "Agence non trouvée ou non supprimée",
                    code: 404
                };
            }

            return {
                status: true,
                message: "Agence restaurée",
                body: result,
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

    // Colonnes dans le même ordre que la requête
    const columns = [
      "name", "address", "cities_served", "phone", "email",
      "logo", "opening_hours", "custom_hours", "created_by"
    ];

    // Générer dynamiquement la partie VALUES pour plusieurs lignes
    const valuePlaceholders = agencies
      .map((_, i) => {
        const baseIndex = i * columns.length;
        const placeholders = columns.map((_, j) => `$${baseIndex + j + 1}`).join(", ");
        return `(${placeholders})`;
      })
      .join(", ");

    // Extraire tous les paramètres dans un tableau plat
    const params = agencies.flatMap(agency => [
      agency.name,
      agency.address,
      agency.cities_served,
      agency.phone,
      agency.email,
      agency.logo,
      agency.opening_hours,
      agency.custom_hours,
      agency.created_by
    ]);

    const query = `
      INSERT INTO ${kAgency} (${columns.join(", ")})
      VALUES ${valuePlaceholders}
      RETURNING *
    `;

    const result = await pgpDb.manyOrNone(query, params);

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