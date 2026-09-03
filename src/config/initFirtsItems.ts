

import UserModel from "../models/user.model";
import { TripGenerationService } from "../services/tripGeneration.service";
import { TripSchedulerService } from "../services/tripScheduler.service";
import initChatData from "./initChatData";
import {
  kInitialLogin,
  kInitialPassword,
  kMd5,
  kUsers,

} from "../utils/constants";
import { pgAny, pgNone } from "../utils/prisma-compat";
import bcrypt from "bcrypt";

export default async function initFirstItems() {
  // Initialiser l'utilisateur admin avec le mot de passe par défaut
  // Vérifier si l'utilisateur admin existe déjà
  const data = await pgAny(`SELECT * FROM "${kUsers}"`);
  if (data.length === 0) {
    const hashedPassword = await bcrypt.hash(kInitialPassword, parseInt(process.env.SALT || "10"));
    const user: UserModel = new UserModel({
      login: kInitialLogin,
      password: hashedPassword,
      creation_date: new Date(),
      super_u: kMd5,
      account_status: "enabled",
      role: "admin",
    });

    try {
      await pgNone(
        `INSERT INTO "${kUsers}" (login, password, creation_date, super_u, account_status, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.login, user.password, user.creation_date, user.super_u, user.account_status, user.role]
      );

    } catch (error) {

    }
  }
  
  

// Au démarrage de l'application
const tripScheduler = new TripSchedulerService();
tripScheduler.startScheduling();

const generationService = new TripGenerationService();

generationService.generateTripsForPeriod(
    new Date(),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    1 // ID système
);

// Initialiser les données du chat
await initChatData();
}
  