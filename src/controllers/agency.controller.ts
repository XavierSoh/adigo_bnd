import { Request, Response } from "express";
import { AgencyRepository } from "../repository/agency.repository";
import { promises } from "dns";
import { AgencyModel } from "../models/agency.model";

// multipart/form-data (this controller uses multer for the logo upload)
// sends every field as a string — Prisma's Float? column rejects a raw
// string, so latitude/longitude need explicit parsing before hitting the
// repository, the same way `cities_served`'s comma-split already handles
// its own form-data quirk below.
function parseCoordinate(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = typeof value === 'number' ? value : parseFloat(value as string);
    return Number.isFinite(parsed) ? parsed : undefined;
}

// Same multipart/form-data quirk as parseCoordinate above, for the one JSON
// column this controller touches: Dio's FormData.fromMap stringifies a null
// Dart value to the literal 4-character string "null" rather than omitting
// the field - passed straight through to Prisma's Json? column, it stored
// the JSON *string* "null" (not SQL NULL), which the desktop's
// `json['custom_hours'] as Map<String, dynamic>?` then failed to cast on
// every subsequent read. No UI actually collects custom_hours yet (only the
// flat opening_hours text field), so undefined (omit, keep existing/null)
// is correct for every real caller today; a real JSON-encoded string is
// still accepted for whenever a UI does start sending one.
function parseCustomHours(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined || value === null || value === '' || value === 'null') return undefined;
    if (typeof value === 'object') return value as Record<string, unknown>;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

export class AgencyController {
    static async createAgency(req: Request, res: Response) {
        // Gestion du fichier logo (à implémenter selon votre middleware de fichiers)
        const logoPath = req.file?.path; // Si vous utilisez multer ou équivalent
        const {created_by} =  req.body;
        const agencyData = {
            ...req.body,
            cities_served: req.body.cities_served.split(',').map((city: string) => city.trim()),
            logo: logoPath,
            latitude: parseCoordinate(req.body.latitude),
            longitude: parseCoordinate(req.body.longitude),
            custom_hours: parseCustomHours(req.body.custom_hours),
            created_by: created_by
        };

        const response = await AgencyRepository.create(agencyData);
        res.status(response.code || 500).json(response);
    }

    static async getAgencyById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { includeDeleted } = req.query as { includeDeleted?: string };

        const response = await AgencyRepository.findById(
            parseInt(id),
            includeDeleted === 'true'
        );
        res.status(response.code).json(response);
    }

    static async getAllAgencies(req: Request, res: Response) {
        const { includeDeleted } = req.query;
        const response = await AgencyRepository.findAll(
            includeDeleted === 'true'
        );
        res.status(response.code).json(response);
    }

    static async updateAgency(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const logoPath = req.file?.path;

        const updateData = {
            ...req.body,
            cities_served: req.body.cities_served?.split(',').map((city: string) => city.trim()),
            logo: logoPath || req.body.logo,
            latitude: parseCoordinate(req.body.latitude),
            longitude: parseCoordinate(req.body.longitude),
            custom_hours: parseCustomHours(req.body.custom_hours)
        };

        const response = await AgencyRepository.update(parseInt(id), updateData);
        res.status(response.code).json(response);
    }

    static async softDeleteAgency(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { deleted_by } = req.body;
        if (!deleted_by) {
             res.status(400).json({
                status: false,
                message: "L'ID de l'utilisateur qui supprime est requis",
                code: 400
            });
        }

        const response = await AgencyRepository.softDelete(
            parseInt(id),
            deleted_by ? parseInt(deleted_by) : undefined
        );
        res.status(response.code).json(response);
    } 

    static async deleteAgency(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await AgencyRepository.delete(parseInt(id));
        res.status(response.code).json(response);
    }

    static async restoreAgency(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await AgencyRepository.restore(parseInt(id));
        res.status(response.code).json(response);
    }


    static async bulkCreateAgencies(req: Request, res: Response) {
        const agencies = req.body.agencies;
        if (!Array.isArray(agencies) || agencies.length === 0) {
            return res.status(400).json({
                status: false,
                message: "A list of agencies is required",
                code: 400
            });
        }

        const formattedAgencies = agencies.map((agency: any) => ({
            ...agency,
            cities_served: typeof agency.cities_served === "string"
                ? agency.cities_served.split(',').map((city: string) => city.trim())
                : agency.cities_served,
            logo: agency.logo,
            created_by: agency.created_by
        }));

        const response = await AgencyRepository.bulkCreate(formattedAgencies);
        res.status(response.code || 500).json(response);
    }

 

    static async bulkSampleCreate(req: Request, res: Response) {
        const sample: AgencyModel[] = [
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

        const response = await AgencyRepository.bulkCreate(sample);
        res.status(response.code || 500).json(response);
    }
}