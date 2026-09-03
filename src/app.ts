// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import * as dbInit from './config/init_db';
import { languageMiddleware } from './middleware/language.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { swaggerSpec } from './swagger/swagger';

// Routers
import usersRouter from './routes/users.router';
import staffRouter from './routes/staff.router';
import accessRightsRouter from './routes/access_rights.router';
import contractTypeRouter from './routes/contract_type.router';
import profilerRouter from './routes/profile.router';
import agencyRouter from './routes/agency.router';
import busRouter from './routes/bus.router';
import tripRouter from './routes/trip.router';
import seatRouter from './routes/seat.router';
import bookingRouter from './routes/booking.router';
import generatedTripRouter from './routes/generated-trip.router';
import customerRouter from './routes/customer.router';
import generatedTripSeatRouter from './routes/generated_trip_seat.router';
import chatRouter from './routes/chat.router';
import walletRouter from './routes/wallet.router';
import tierRouter from './routes/tier.router';
import companySettingsRouter from './routes/company-settings.router';
import dashboardRouter from './routes/dashboard.router';
import ticketingRouter from './routes/ticketing';
import vtcRouter from './routes/vtc.router';
import paymentRouter from './routes/payment.router';
import './services/payment/providers';
import './services/payment/settlement-handlers';

const app = express();

// Middlewares
app.use(express.json({limit:"100mb"}));
app.use(cors());
app.use(helmet());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Language detection middleware (doit être après express.json())
app.use(languageMiddleware);

// Home page
app.get('/', (req, res) => {
  const publicPath = path.join(__dirname, '../src/public/index.html');
  const distPublicPath = path.join(__dirname, '../public/index.html');
  const filePath = fs.existsSync(publicPath) ? publicPath : distPublicPath;
  res.sendFile(filePath);
});

// Swagger documentation
app.use('/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Routes
app.use('/v1/api/users', usersRouter);
app.use('/v1/api/staff', staffRouter); 
app.use('/v1/api/contracts-types', contractTypeRouter);
app.use('/v1/api/access_rights', accessRightsRouter);
app.use('/v1/api/profiles', profilerRouter);
app.use('/v1/api/agency', agencyRouter);
app.use('/v1/api/bus', busRouter);
app.use('/v1/api/trip', tripRouter);
app.use('/v1/api/generated_trip', generatedTripRouter);
app.use('/v1/api/seat', seatRouter); 
app.use('/v1/api/booking', bookingRouter);
app.use('/v1/api/customers', customerRouter);
app.use('/v1/api/generated_trip_seats', generatedTripSeatRouter);
app.use('/v1/api/chat', chatRouter);
app.use('/v1/api/wallet', walletRouter);
app.use('/v1/api/tier', tierRouter);
app.use('/v1/api/company-settings', companySettingsRouter);
app.use('/v1/api/dashboard', dashboardRouter);

// Ticketing Module
app.use('/v1/api/ticketing', ticketingRouter);

// VTC Module
app.use('/v1/api/vtc', vtcRouter);

// Food Delivery / Parcel Delivery modules removed (pg-promise→Prisma
// cleanup): scaffolded, never had backing DB tables
// (restaurants/food_orders/parcel_shipments never existed in the schema —
// see BOOKING_MODULE_NOTES.md), every route always 500'd. Deleted rather
// than converted, per explicit user decision.

// Payments (Orange Money)
app.use('/v1/api/payments', paymentRouter);

// ✅ Initialiser la base de données de manière asynchrone
export async function initializeApp() {
  try {
    console.log('🚀 Démarrage de l\'initialisation...');
    await dbInit.initDb();
    console.log('✅ Base de données initialisée avec succès');
    return app; 
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la DB:', error);
    throw error;
  }
}

// Lancer l'initialisation immédiatement
initializeApp().catch(err => {
  console.error('💥 Erreur fatale lors du démarrage:', err);
  process.exit(1); // Arrêter l'application si l'init échoue
});

export default app;