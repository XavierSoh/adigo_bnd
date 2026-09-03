# ADIGO API - Guide DevOps

Ce document explique l'architecture DevOps mise en place pour le projet ADIGO API.

---

## Table des matières

1. [Architecture générale](#architecture-générale)
2. [Configuration Firebase](#configuration-firebase)
3. [CI/CD avec GitHub Actions](#cicd-avec-github-actions)
4. [Page d'accueil et Documentation](#page-daccueil-et-documentation)
5. [Authentification JWT](#authentification-jwt)
6. [Structure du projet](#structure-du-projet)

---

## Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Mobile/Web)                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTP/HTTPS
                  ▼
┌─────────────────────────────────────────────────────────┐
│           VPS Production (api.adigobookings.com)         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Node.js Express Server (port 3800)              │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │  Routes protégées par JWT                │   │   │
│  │  │  ┌──────────────┐                        │   │   │
│  │  │  │ Users API    │                        │   │   │
│  │  │  │ Bookings API │                        │   │   │
│  │  │  │ Chat API     │  Nécessite token JWT  │   │   │
│  │  │  │ Food API     │                        │   │   │
│  │  │  └──────────────┘                        │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │  Routes publiques                        │   │   │
│  │  │  - /users/login (POST)                   │   │   │
│  │  │  - /users/create (POST)                  │   │   │
│  │  │  - /v1/api-docs (Swagger)                │   │   │
│  │  │  - / (Home page)                         │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                       │                                  │
│                       ├─── PostgreSQL (Database)        │
│                       └─── Firebase (Push notifications)│
└─────────────────────────────────────────────────────────┘
                  ▲
                  │ Git push
                  │
┌─────────────────────────────────────────────────────────┐
│            GitHub Repository                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  GitHub Actions (CI/CD Pipeline)                │   │
│  │  ├─ Trigger: Push vers main                      │   │
│  │  ├─ Job: SSH vers VPS                           │   │
│  │  ├─ Clean dist folder                           │   │
│  │  ├─ npm install                                 │   │
│  │  ├─ npm run build (TypeScript compilation)      │   │
│  │  └─ pm2 restart (Redémarrage de l'app)         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Configuration Firebase

### Pourquoi Firebase ?

Firebase Cloud Messaging (FCM) permet d'envoyer des **notifications push** aux applications mobiles (iOS/Android).

### Setup

#### 1. Créer les credentials Firebase

```bash
# Va sur https://console.firebase.google.com
# Settings → Service Accounts → Generate New Private Key
# Télécharge le JSON
```

#### 2. Deux façons de configurer

**Option A : Fichier JSON (développement local)**
```bash
# Copie le fichier téléchargé
cp firebase-service-account.json ./

# Ne pas commit (déjà dans .gitignore)
```

**Option B : Variables d'environnement (production)**
```bash
# Dans ton .env
FIREBASE_PROJECT_ID=adigo-fa32c
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@adigo-fa32c.iam.gserviceaccount.com
```

#### 3. Code (notification.service.ts)

```typescript
// Charge depuis fichier JSON OU variables d'env
const serviceAccount = require(firebaseJsonPath);
// OU
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Envoyer une notification
await admin.messaging().send({
  token: fcmToken,
  notification: { title: "Titre", body: "Message" }
});
```

#### 4. GitHub Secrets (pour CI/CD)

Ajoute dans **GitHub Settings → Secrets and variables → Actions** :
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

Le workflow CI/CD les récupère et les passe au VPS lors du déploiement.

---

## CI/CD avec GitHub Actions

### Flux de déploiement

```
1. Developer fait git push vers main
                    ▼
2. GitHub Actions déclenche le workflow
                    ▼
3. Action appleboy/ssh-action se connecte au VPS
                    ▼
4. Sur le VPS :
   ├─ rm -rf dist/ (nettoie les anciens fichiers)
   ├─ git pull origin main (récupère le code)
   ├─ npm install (installe dépendances)
   ├─ npm run build (compile TypeScript)
   └─ pm2 restart adigo-api (redémarre l'app)
                    ▼
5. L'app est à jour en production
```

### Fichier workflow (.github/workflows/deploy.yml)

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]  # Se déclenche à chaque push sur main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}           # IP du VPS
          username: ${{ secrets.VPS_USER }}       # User SSH
          key: ${{ secrets.VPS_SSH_KEY }}         # Clé SSH privée
          envs: FIREBASE_PROJECT_ID,FIREBASE_PRIVATE_KEY,...
          env:
            FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
            # ... autres secrets ...
          script: |
            cd /var/www/adigo
            rm -rf dist/
            git pull origin main
            npm install
            npm run build
            pm2 restart adigo-api || pm2 start ecosystem.config.js
```

### Secrets GitHub requis

```
VPS_HOST              → IP du serveur (ex: 123.456.789.0)
VPS_USER              → User pour SSH (ex: root)
VPS_SSH_KEY           → Clé privée SSH (contenu de ~/.ssh/id_rsa)
FIREBASE_PROJECT_ID   → Ton project ID Firebase
FIREBASE_PRIVATE_KEY  → Clé privée Firebase
FIREBASE_CLIENT_EMAIL → Email du service account
```

### Comment générer la clé SSH pour GitHub ?

```bash
# Sur ton serveur VPS
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy

# Ajoute la clé publique à authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copie la clé privée vers GitHub Secrets
cat ~/.ssh/github_deploy
# Colle le contenu dans VPS_SSH_KEY
```

---

## Page d'accueil et Documentation

### 1. Page d'accueil (/)(src/public/index.html)

Une page HTML attractiveavec :
- Design gradient moderne (violet/indigo)
- Statut de l'API en temps réel
- Listes des endpoints disponibles
- Boutons d'action (Explorer API, Contact Support)

```
http://localhost:3800/
↓
Affiche : "ADIGO API - Transportation & Delivery Management System"
Bouton : "Explore API" → /v1/api-docs
```

### 2. Swagger Documentation (/v1/api-docs)

Utilise **swagger-ui-express** et **swagger-jsdoc**.

Configuration (src/swagger/swagger.ts) :
```typescript
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ADIGO API',
      version: '1.0.0'
    },
    servers: [
      { url: 'http://localhost:3800/v1/api', description: 'Dev' },
      { url: 'https://api.adigobookings.com/v1/api', description: 'Prod' }
    ]
  },
  apis: ['./src/routes/**/*.ts']  // Scan les fichiers pour les commentaires JSDoc
};
```

Intégration dans app.ts :
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/swagger';

app.use('/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### 3. Documenter un endpoint

Dans ton fichier route, ajoute des commentaires JSDoc :

```typescript
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized - Missing or invalid token
 */
router.get('/', authMiddleware, UserController.getAllUsers);
```

Swagger scannera automatiquement et créera une interface interactive.

---

## Authentification JWT

### Concept

**JWT (JSON Web Token)** = Un token qui prouve l'identité d'un utilisateur.

```
┌─────────────────────────────────────────────┐
│  1. User fait login avec email + password   │
└────────────────────┬────────────────────────┘
                     ▼
┌─────────────────────────────────────────────┐
│  2. Server vérifie les credentials          │
│     et génère un JWT                        │
└────────────────────┬────────────────────────┘
                     ▼
┌─────────────────────────────────────────────┐
│  3. Server retourne le token au client      │
│     {                                        │
│       "token": "eyJhbGciOiJIUzI1NiIs..."   │
│     }                                        │
└────────────────────┬────────────────────────┘
                     ▼
┌─────────────────────────────────────────────┐
│  4. Client stocke le token (localStorage)   │
└────────────────────┬────────────────────────┘
                     ▼
┌─────────────────────────────────────────────┐
│  5. Client envoie le token pour chaque      │
│     requête protégée                        │
│                                             │
│     GET /users                              │
│     Authorization: Bearer <token>           │
└────────────────────┬────────────────────────┘
                     ▼
┌─────────────────────────────────────────────┐
│  6. Server vérifie le token                 │
│     - Valide ? Accès accordé ✓              │
│     - Expiré ? Erreur 401 ✗                 │
│     - Invalide ? Erreur 401 ✗               │
└─────────────────────────────────────────────┘
```

### Setup

#### Middleware d'authentification (src/middleware/auth.middleware.ts)

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'adigo_secret_key_2025';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Vérifie que le header existe
    if (!authHeader) {
      return res.status(401).json({
        status: false,
        message: 'No authorization token provided',
        code: 401
      });
    }

    // Extrait le token ("Bearer <token>" → "<token>")
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    // Vérifie la signature du token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attache les infos utilisateur à la requête
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

#### Application aux routes

```typescript
import { authMiddleware } from '../middleware/auth.middleware';

const usersRouter = Router();

// Routes PUBLIQUES (pas de JWT)
usersRouter.post('/create', UserController.register);
usersRouter.post('/login', UserController.login);

// Applique le middleware JWT à toutes les routes suivantes
usersRouter.use(authMiddleware);

// Routes PROTÉGÉES (JWT requis)
usersRouter.get('/', UserController.getAllUsers);
usersRouter.put('/:id', UserController.updateUser);
usersRouter.delete('/:id', UserController.deleteUser);
```

### Utilisation (client-side)

```javascript
// 1. Login et récupérer le token
const response = await fetch('https://api.adigobookings.com/v1/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: 'admin', password: 'password123' })
});

const data = await response.json();
const token = data.body.token;

// 2. Stocker le token
localStorage.setItem('authToken', token);

// 3. Utiliser le token pour les requêtes protégées
const response = await fetch('https://api.adigobookings.com/v1/api/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Sécurité

- **Secret JWT** : À mettre dans `.env` (ne jamais commit)
- **Expiration** : Ajoute une date d'expiration `expiresIn: '7d'`
- **HTTPS obligatoire** : Le token voyage en clair dans le header (SSL/TLS le chiffre)
- **Refresh tokens** : Implémente des refresh tokens pour les tokens de longue durée

---

## Structure du projet

```
adigo_bnd/
├── src/
│   ├── config/
│   │   ├── database.ts          # Connexion PostgreSQL
│   │   └── init_db.ts           # Initialisation DB
│   │
│   ├── controllers/             # Logique métier
│   │   ├── user.controller.ts
│   │   ├── booking.controller.ts
│   │   └── ...
│   │
│   ├── routes/                  # Définition des endpoints
│   │   ├── users.router.ts
│   │   ├── booking.router.ts
│   │   └── ...
│   │
│   ├── middleware/              # Middlewares Express
│   │   ├── auth.middleware.ts   # JWT verification
│   │   ├── language.middleware.ts
│   │   └── upload.middleware.ts
│   │
│   ├── services/                # Services métier
│   │   └── notification.service.ts  # Firebase FCM
│   │
│   ├── swagger/
│   │   └── swagger.ts           # Configuration Swagger
│   │
│   ├── public/
│   │   └── index.html           # Page d'accueil
│   │
│   ├── app.ts                   # Configuration Express
│   └── index.ts                 # Entry point
│
├── dist/                        # Compilé (générépour la production)
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions pipeline
│
├── .env                         # Variables d'environnement (ne pas commit)
├── .env.example                 # Template des variables (commit ce fichier)
├── .gitignore                   # Fichiers à ignorer
├── tsconfig.json                # Configuration TypeScript
├── package.json                 # Dépendances
├── ecosystem.config.js          # Configuration PM2
└── DEVOPS_GUIDE.md             # Ce fichier
```

---

## Résumé des outils utilisés

| Outil | Usage | Version |
|-------|-------|---------|
| **Express.js** | Framework web | ^5.1.0 |
| **TypeScript** | Typage statique | ^5.8.3 |
| **PostgreSQL** | Base de données | 8.16+ |
| **pg-promise** | Client PostgreSQL | ^11.15.0 |
| **JWT** | Authentification | ^9.0.2 |
| **Firebase Admin** | Push notifications | ^13.6.0 |
| **Swagger UI** | Documentation API | ^5.0.1 |
| **PM2** | Process manager | - |
| **GitHub Actions** | CI/CD automation | - |

---

## Commandes utiles

```bash
# Développement local
npm run dev              # Lance le serveur en développement (hot reload)
npm run build            # Compile TypeScript vers dist/
npm start                # Lance l'app compilée

# Production (VPS)
pm2 start ecosystem.config.js    # Démarre l'app avec PM2
pm2 stop adigo-api               # Arrête l'app
pm2 restart adigo-api            # Redémarre l'app
pm2 logs adigo-api               # Voir les logs
pm2 monit                        # Monitor en temps réel

# Git
git add .
git commit -m "Message"
git push origin main             # Déclenche le déploiement CI/CD

# Tests
npm run test                     # Lancer les tests
```

---

## Checklist de déploiement

- [ ] Variables d'environnement configurées sur le VPS
- [ ] Secrets GitHub créés (VPS_HOST, VPS_USER, VPS_SSH_KEY, FIREBASE_*)
- [ ] SSH key générée et ajoutée au VPS
- [ ] Base de données PostgreSQL accessible
- [ ] Firebase credentials configurés
- [ ] PM2 en cluster mode sur le VPS
- [ ] HTTPS/SSL configuré
- [ ] Monitoring et logs en place
- [ ] Backup database automatisé
- [ ] Rate limiting sur les API

---

## Prochaines étapes

1. **Appliquer JWT à toutes les routes** selon tes besoins
2. **Documenter tous les endpoints** avec Swagger JSDoc
3. **Ajouter des tests unitaires** (Jest)
4. **Mettre en place un monitoring** (Sentry, DataDog)
5. **Rate limiting** (express-rate-limit)
6. **Validation des inputs** (joi, zod)
7. **Logs centralisés** (Winston, ELK)
8. **Backup database automatisé**

---

**Dernière mise à jour** : 2 février 2026
**Auteur** : Claude Code
