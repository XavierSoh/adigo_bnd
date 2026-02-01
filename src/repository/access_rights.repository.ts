
import { response } from 'express';
import pgpDb from '../config/pgdb'; 
import * as tbl from '../utils/table_names';
import ResponseModel from '../models/response.model';
export class accessRightsRepository {

    // Permissions à insérer
       static permissions = [
        // ===== GESTION GLOBALE =====
        { 
            key: 'ADMIN_FULL_ACCESS', 
            module: 'global', 
            module_name_en: 'Global', 
            module_name_fr: 'Global', 
            description_en: 'Full administrative access', 
            description_fr: 'Accès administratif complet' 
        },
        { 
            key: 'MANAGE_AGENCY_SETTINGS', 
            module: 'global', 
            module_name_en: 'Global', 
            module_name_fr: 'Global', 
            description_en: 'Manage agency settings', 
            description_fr: "Gérer les paramètres de l'agence" 
        },

        // ===== GESTION DU PERSONNEL =====
        { 
            key: 'MANAGE_STAFF', 
            module: 'staff', 
            module_name_en: 'Staff Management', 
            module_name_fr: 'Gestion du personnel', 
            description_en: 'Manage agency staff', 
            description_fr: 'Gérer le personnel de l\'agence' 
        },
        { 
            key: 'MANAGE_ROLES', 
            module: 'staff', 
            module_name_en: 'Staff Management', 
            module_name_fr: 'Gestion du personnel', 
            description_en: 'Manage roles and permissions', 
            description_fr: 'Gérer les rôles et permissions' 
        },

        // ===== GESTION DES BUS =====
        { 
            key: 'MANAGE_BUSES', 
            module: 'fleet', 
            module_name_en: 'Bus Fleet', 
            module_name_fr: 'Flotte de bus', 
            description_en: 'Manage bus fleet', 
            description_fr: 'Gérer la flotte de bus' 
        },
        { 
            key: 'MANAGE_SEATS', 
            module: 'fleet', 
            module_name_en: 'Bus Fleet', 
            module_name_fr: 'Flotte de bus', 
            description_en: 'Configure bus seating', 
            description_fr: 'Configurer les places des bus' 
        },

        // ===== GESTION DES TRAJETS =====
        { 
            key: 'MANAGE_ROUTES', 
            module: 'routes', 
            module_name_en: 'Routes', 
            module_name_fr: 'Trajets', 
            description_en: 'Manage bus routes', 
            description_fr: 'Gérer les trajets des bus' 
        },
        { 
            key: 'MANAGE_SCHEDULES', 
            module: 'routes', 
            module_name_en: 'Routes', 
            module_name_fr: 'Trajets', 
            description_en: 'Manage schedules', 
            description_fr: 'Gérer les horaires' 
        },

        // ===== GESTION DES RÉSERVATIONS =====
        { 
            key: 'VIEW_ALL_BOOKINGS', 
            module: 'bookings', 
            module_name_en: 'Bookings', 
            module_name_fr: 'Réservations', 
            description_en: 'View all bookings', 
            description_fr: 'Voir toutes les réservations' 
        },
        { 
            key: 'MANAGE_BOOKINGS', 
            module: 'bookings', 
            module_name_en: 'Bookings', 
            module_name_fr: 'Réservations', 
            description_en: 'Create/edit bookings', 
            description_fr: 'Créer/modifier les réservations' 
        },
        { 
            key: 'CANCEL_BOOKINGS', 
            module: 'bookings', 
            module_name_en: 'Bookings', 
            module_name_fr: 'Réservations', 
            description_en: 'Cancel bookings', 
            description_fr: 'Annuler des réservations' 
        },

        // ===== GESTION FINANCIÈRE =====
        { 
            key: 'MANAGE_PAYMENTS', 
            module: 'finance', 
            module_name_en: 'Finance', 
            module_name_fr: 'Finances', 
            description_en: 'Process payments', 
            description_fr: 'Traiter les paiements' 
        },
        { 
            key: 'GENERATE_REPORTS', 
            module: 'finance', 
            module_name_en: 'Finance', 
            module_name_fr: 'Finances', 
            description_en: 'Generate financial reports', 
            description_fr: 'Générer des rapports financiers' 
        },

        // ===== OUTILS =====
        { 
            key: 'ACCESS_ANALYTICS', 
            module: 'tools', 
            module_name_en: 'Analytics', 
            module_name_fr: 'Analytiques', 
            description_en: 'Access business analytics', 
            description_fr: 'Accéder aux analyses commerciales' 
        }
    ];


   static  async getAllAccessRights(): Promise<ResponseModel> {
    let responseModel: ResponseModel;
        try {
            const result = await pgpDb.query(`SELECT DISTINCT * FROM ${tbl.kAccessRight}`);
             responseModel ={
                code: 200,
                message: 'Droits d\'accès récupérés avec succès',
                body: result, 
                status:true,
                exception:null
            }

return responseModel;
        } catch (err) {
            responseModel = {
                code: 500,
                message: 'Erreur lors de la récupération des droits d\'accès',
                body: null,
                status: false,
                exception: err instanceof Error ? err.message : 'Unknown error'
            };
           
            return responseModel;
        }
    }
 static    async setUpAccessRights(): Promise<any> {
       try {
    // Insérer les permissions
    const insertQuery = ` 
      INSERT INTO ${tbl.kAccessRight} (key, module, module_name_en, module_name_fr, description_en, description_fr)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (key) DO NOTHING;
    `;
    for (const permission of this.permissions) {
      await pgpDb.none(insertQuery, [
        permission.key,
        permission.module,
        permission.module_name_en,
        permission.module_name_fr,  
        permission.description_en,
        permission.description_fr,
      ]);
    }

  
  } catch (error) {
    console.error('Erreur lors de la configuration des permissions:', error);
  }
    }
 
}