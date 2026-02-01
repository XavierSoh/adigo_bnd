"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgencyController = void 0;
const agency_repository_1 = require("../repository/agency.repository");
class AgencyController {
    static async createAgency(req, res) {
        // Gestion du fichier logo (à implémenter selon votre middleware de fichiers)
        const logoPath = req.file?.path; // Si vous utilisez multer ou équivalent
        const { created_by } = req.body;
        const agencyData = {
            ...req.body,
            cities_served: req.body.cities_served.split(',').map((city) => city.trim()),
            logo: logoPath,
            created_by: created_by
        };
        const response = await agency_repository_1.AgencyRepository.create(agencyData);
        res.status(response.code || 500).json(response);
    }
    static async getAgencyById(req, res) {
        const { id } = req.params;
        const { includeDeleted } = req.query;
        const response = await agency_repository_1.AgencyRepository.findById(parseInt(id), includeDeleted === 'true');
        res.status(response.code).json(response);
    }
    static async getAllAgencies(req, res) {
        const { includeDeleted } = req.query;
        const response = await agency_repository_1.AgencyRepository.findAll(includeDeleted === 'true');
        res.status(response.code).json(response);
    }
    static async updateAgency(req, res) {
        const { id } = req.params;
        const logoPath = req.file?.path;
        const updateData = {
            ...req.body,
            cities_served: req.body.cities_served?.split(',').map((city) => city.trim()),
            logo: logoPath || req.body.logo
        };
        const response = await agency_repository_1.AgencyRepository.update(parseInt(id), updateData);
        res.status(response.code).json(response);
    }
    static async softDeleteAgency(req, res) {
        const { id } = req.params;
        const { deleted_by } = req.body;
        if (!deleted_by) {
            res.status(400).json({
                status: false,
                message: "L'ID de l'utilisateur qui supprime est requis",
                code: 400
            });
        }
        const response = await agency_repository_1.AgencyRepository.softDelete(parseInt(id), deleted_by ? parseInt(deleted_by) : undefined);
        res.status(response.code).json(response);
    }
    static async deleteAgency(req, res) {
        const { id } = req.params;
        const response = await agency_repository_1.AgencyRepository.delete(parseInt(id));
        res.status(response.code).json(response);
    }
    static async restoreAgency(req, res) {
        const { id } = req.params;
        const response = await agency_repository_1.AgencyRepository.restore(parseInt(id));
        res.status(response.code).json(response);
    }
    static async bulkCreateAgencies(req, res) {
        const agencies = req.body.agencies;
        if (!Array.isArray(agencies) || agencies.length === 0) {
            return res.status(400).json({
                status: false,
                message: "A list of agencies is required",
                code: 400
            });
        }
        const formattedAgencies = agencies.map((agency) => ({
            ...agency,
            cities_served: typeof agency.cities_served === "string"
                ? agency.cities_served.split(',').map((city) => city.trim())
                : agency.cities_served,
            logo: agency.logo,
            created_by: agency.created_by
        }));
        const response = await agency_repository_1.AgencyRepository.bulkCreate(formattedAgencies);
        res.status(response.code || 500).json(response);
    }
    static async bulkSampleCreate(req, res) {
        const sample = [
            {
                name: "Agence Alpha",
                address: "123 Rue Principale, Paris",
                cities_served: ["Paris", "Versailles"],
                phone: "+33 1 23 45 67 89",
                email: "contact@alpha.fr",
                logo: "/uploads/adigo.png",
                opening_hours: "24/7",
                created_by: 1
            },
            {
                name: "Agence Beta",
                address: "456 Avenue du Sud, Lyon",
                cities_served: ["Lyon", "Villeurbanne"],
                phone: "+33 4 56 78 90 12",
                email: "contact@beta.fr",
                logo: "/uploads/adigo.png",
                opening_hours: "custom",
                custom_hours: {
                    monday: { open: "08:00", close: "18:00" },
                    tuesday: { open: "08:00", close: "18:00" },
                    wednesday: { open: "08:00", close: "18:00" },
                    thursday: { open: "08:00", close: "18:00" },
                    friday: { open: "08:00", close: "18:00" }
                },
                created_by: 1
            },
            {
                name: "Agence Gamma",
                address: "789 Boulevard Central, Marseille",
                cities_served: ["Marseille", "Aix-en-Provence"],
                phone: "+33 6 12 34 56 78",
                email: "contact@gamma.fr",
                logo: "/uploads/adigo.png",
                opening_hours: "24/7",
                created_by: 1
            },
            {
                name: "Agence Delta",
                address: "321 Rue du Nord, Lille",
                cities_served: ["Lille", "Roubaix"],
                phone: "+33 3 98 76 54 32",
                email: "contact@delta.fr",
                logo: "/uploads/adigo.png",
                opening_hours: "custom",
                custom_hours: {
                    monday: { open: "09:00", close: "17:00" },
                    tuesday: { open: "09:00", close: "17:00" },
                    wednesday: { open: "09:00", close: "17:00" },
                    thursday: { open: "09:00", close: "17:00" },
                    friday: { open: "09:00", close: "17:00" }
                },
                created_by: 1
            },
            {
                name: "Agence Epsilon",
                address: "654 Avenue de l'Ouest, Bordeaux",
                cities_served: ["Bordeaux", "Mérignac"],
                phone: "+33 5 67 89 01 23",
                email: "contact@epsilon.fr",
                logo: "/uploads/adigo.png",
                opening_hours: "24/7",
                created_by: 1
            }
        ];
        const response = await agency_repository_1.AgencyRepository.bulkCreate(sample);
        res.status(response.code || 500).json(response);
    }
}
exports.AgencyController = AgencyController;
