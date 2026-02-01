"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = initFirstItems;
const user_model_1 = __importDefault(require("../models/user.model"));
const tripGeneration_service_1 = require("../services/tripGeneration.service");
const tripScheduler_service_1 = require("../services/tripScheduler.service");
const initChatData_1 = __importDefault(require("./initChatData"));
const constants_1 = require("../utils/constants");
const pgdb_1 = __importDefault(require("./pgdb"));
const bcrypt_1 = __importDefault(require("bcrypt"));
async function initFirstItems() {
    // Initialiser l'utilisateur admin avec le mot de passe par défaut
    // Vérifier si l'utilisateur admin existe déjà
    await pgdb_1.default.manyOrNone(`SELECT * FROM "${constants_1.kUsers}"`).then(async (data) => {
        if (data.length === 0) {
            const hashedPassword = await bcrypt_1.default.hash(constants_1.kInitialPassword, parseInt(process.env.SALT || "10"));
            const user = new user_model_1.default({
                login: constants_1.kInitialLogin,
                password: hashedPassword,
                creation_date: new Date(),
                super_u: constants_1.kMd5,
                account_status: "enabled",
                role: "admin",
            });
            try {
                await pgdb_1.default.none(`INSERT INTO "${constants_1.kUsers}" (login, password, creation_date, super_u, account_status, role)
           VALUES ($1, $2, $3, $4, $5, $6)`, [user.login, user.password, user.creation_date, user.super_u, user.account_status, user.role]);
            }
            catch (error) {
            }
        }
        else {
        }
    });
    // Au démarrage de l'application
    const tripScheduler = new tripScheduler_service_1.TripSchedulerService();
    tripScheduler.startScheduling();
    const generationService = new tripGeneration_service_1.TripGenerationService();
    generationService.generateTripsForPeriod(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    1 // ID système
    );
    // Initialiser les données du chat
    await (0, initChatData_1.default)();
}
