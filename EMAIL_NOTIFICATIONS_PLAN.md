# Adigo — Plan des notifications email

Ce document liste tous les cas d'usage de notification par email identifiés
dans les modules Booking, VTC et Ticketing, l'infrastructure mise en place
pour les envoyer, ce qui est déjà implémenté, et ce qui reste à faire pour
les prochaines sessions. Lire ce fichier avant de toucher à quoi que ce soit
lié aux emails — l'infrastructure (Postal, credentials SMTP, templates) ne
doit pas être redécouverte/reconstruite.

---

## 1. Infrastructure (déjà en place, ne pas reconstruire)

- **Serveur mail** : Postal (self-hosted), déjà présent sur le VPS de
  production (containers `postal-smtp-1`/`postal-web-1`/`postal-worker-1`/
  `postal-rabbitmq`, 4 autres projets — ubora, abs — l'utilisaient avant
  d'être retirés du VPS le 2026-09-03 ; Postal lui-même n'a pas été touché).
- **Domaine d'envoi** : `adigobookings.com`, déjà vérifié dans Postal (SPF
  OK, DKIM OK), rattaché au serveur Postal "Ubora Mail" (organisation
  "Ubora", id=1 côté Postal — nom historique, aucun rapport avec Adigo,
  ne pas renommer sans vérifier que ça ne casse rien côté Postal).
- **Credential SMTP** : un credential Postal dédié `adigo-backend` (type
  SMTP) a été créé pour le serveur Postal id=1. Ses valeurs vivent
  uniquement dans `/var/www/adigo/.env` sur le VPS (`SMTP_HOST=127.0.0.1`,
  `SMTP_PORT=25`, `SMTP_USER=adigo-backend`, `SMTP_PASS=<généré>`,
  `SMTP_FROM=ADIGO <noreply@adigobookings.com>`) — jamais commité, jamais
  ressorti en clair même pendant la mise en place. Testé end-to-end (envoi
  réel reçu, statut "Sent" confirmé côté `postal-server-1.messages`).
- **Service générique** : [src/services/email.service.ts](src/services/email.service.ts)
  — `sendEmail({to, subject, html, text})`, ne lève jamais d'exception
  (retourne `false` si SMTP non configuré ou si l'envoi échoue), pour que
  l'action métier qui déclenche l'email (inscription, réservation…) ne soit
  jamais bloquée par une panne mail. Toujours appeler en fire-and-forget
  (`.catch(() => {})`) depuis les repositories, jamais `await` bloquant sur
  le chemin de réponse HTTP.
- **Templates bilingues** : [src/emails/templates.ts](src/emails/templates.ts)
  — un template = une fonction `(lang: 'fr'|'en', params) => {subject, html, text}`.
  Réutilise le type `Language` de [src/utils/i18n.ts](src/utils/i18n.ts) et le
  même style visuel que `src/public/index.html` (dégradé violet/indigo
  `#667eea → #764ba2`). Ajouter un nouveau template = ajouter une fonction
  dans ce fichier, pas un nouveau système.
- **Détection de langue** : chaque email est envoyé dans la langue de
  `customer.preferred_language` (colonne existante, défaut `'fr'`) — ne
  jamais deviner la langue autrement (pas de géo-IP, pas de header
  `Accept-Language` pour un email transactionnel, seulement la préférence
  stockée en base).
- **Variable d'environnement `API_BASE_URL`** : base des liens embarqués
  dans les emails (ex. lien de vérification). Vaut
  `https://api.adigobookings.com` par défaut si absente.

**Comment ajouter un nouvel email** : (1) ajouter la fonction de template
dans `templates.ts`, (2) appeler `sendEmail(...)` depuis le repository
concerné au bon endroit (jamais depuis le controller — garder la logique
métier dans la couche repository, comme pour `customer.repository.ts`),
(3) si l'email a besoin d'un lien/code à durée de vie, ajouter les colonnes
nécessaires via un nouveau `src/config/migrate_*.ts` idempotent, suivant le
pattern de [migrate_customer_auth_tokens.ts](src/config/migrate_customer_auth_tokens.ts),
et l'enregistrer dans `initDb()` ([src/config/init_db.ts](src/config/init_db.ts))
pour qu'il s'applique automatiquement à chaque démarrage (ne pas répéter
l'erreur des fichiers `.sql` orphelins dans `/migrations` qui ne sont
jamais exécutés automatiquement).

---

## 2. Déjà implémenté (2026-09-03)

| Cas d'usage | Déclencheur | Contenu |
|---|---|---|
| Bienvenue + vérification email | `CustomerRepository.create()` | Lien de vérification (token, expire 24h) → `GET /v1/api/customers/verify-email/:token`, page HTML de confirmation |
| Code de réinitialisation mot de passe | `CustomerRepository.forgotPassword()` | Code à 6 chiffres (expire 30 min), saisi dans l'app via `POST /v1/api/customers/reset-password` |

Endpoints ajoutés : `POST /customers/forgot-password`, `POST /customers/reset-password`,
`GET /customers/verify-email/:token`. Aucun frontend web créé — le reset se
fait par code entré dans l'app mobile (pas de lien cliquable), car il n'existe
aucun frontend web client à héberger pour un formulaire de reset.

**Non fait volontairement** : email de confirmation "mot de passe changé"
(notice de sécurité après un reset réussi) — ajout rapide, backlog ci-dessous.

---

## 3. Backlog — Module Booking

Fichiers clés : [src/controllers/booking.controller.ts](src/controllers/booking.controller.ts),
[src/repository/booking.repository.ts](src/repository/booking.repository.ts).

| # | Cas d'usage | Déclencheur (fonction) | Priorité | Notes |
|---|---|---|---|---|
| B1 | Confirmation de réservation | `create`, `createMultiple`, `createBatch` | Haute | Doit inclure référence de réservation, trajet, siège, montant |
| B2 | Annulation de réservation | `cancelSingle`, `cancelBatch` | Haute | Inclure info remboursement si applicable (wallet vs paiement direct) |
| B3 | Rappel avant départ (J-1 ou H-2) | Aucun déclencheur existant | Moyenne | Nécessite un job planifié (voir `tripScheduler.service.ts` comme modèle existant de tâche planifiée) — n'existe pas encore |
| B4 | Remboursement traité | Settlement handlers (`src/services/payment/settlement-handlers/booking.settlement.ts`) | Moyenne | Distinct de B2 : le remboursement peut arriver après coup (ex. paiement mobile money en attente) |

---

## 4. Backlog — Module VTC (ride-hailing)

Fichiers clés : [src/controllers/vtc/ride.controller.ts](src/controllers/vtc/ride.controller.ts),
[src/controllers/vtc/driver.controller.ts](src/controllers/vtc/driver.controller.ts).

| # | Cas d'usage | Déclencheur (fonction) | Priorité | Notes |
|---|---|---|---|---|
| V1 | Course confirmée | `createRide` | Basse | Généralement instantané dans l'app (pas de valeur ajoutée par email) — à confirmer avec le produit avant de l'implémenter |
| V2 | Chauffeur assigné | `assignDriver` | Basse | Idem V1, redondant avec la notif push existante (`updateFcmToken`) |
| V3 | Course terminée — reçu | `updateStatus` (transition vers `completed`) | Haute | Le seul VTC à forte valeur : reçu de course (montant, trajet, chauffeur, note) |
| V4 | Course annulée | `cancelRide` | Moyenne | Préciser qui a annulé (client/chauffeur/admin) et pourquoi si fourni |
| V5 | Candidature chauffeur reçue | `createDriver` | Moyenne | Accusé de réception simple |
| V6 | Chauffeur approuvé / rejeté | **Aucun endpoint dédié** — probablement déclenché depuis `updateDriver` quand un champ de statut passe à `approved`/`rejected` | Haute | Vérifier d'abord le schéma `vtc_drivers` pour la colonne de statut exacte avant d'implémenter — non vérifié dans cette session |

---

## 5. Backlog — Module Ticketing (billetterie)

Fichiers clés : [src/controllers/ticketing/ticket.controller.ts](src/controllers/ticketing/ticket.controller.ts),
[src/controllers/ticketing/event.controller.ts](src/controllers/ticketing/event.controller.ts),
[src/ticketing/controllers/event-validation.controller.ts](src/ticketing/controllers/event-validation.controller.ts).

| # | Cas d'usage | Déclencheur (fonction) | Priorité | Notes |
|---|---|---|---|---|
| T1 | Achat de billet confirmé (e-ticket) | `ticket.controller.ts` → `confirmPayment` (pas `purchase` — vérifier lequel finalise réellement l'achat selon le flux de paiement actuel) | Haute | Le plus important du module : doit inclure le QR code (déjà généré ailleurs, voir `qrcode.service.ts` dans les tests) en pièce jointe ou lien |
| T2 | Billet annulé / remboursé | `ticket.controller.ts` → `cancel` | Moyenne | |
| T3 | Rappel avant événement | Aucun déclencheur existant | Basse | Comme B3, nécessite un job planifié |
| T4 | Événement soumis à validation (accusé organisateur) | `event.controller.ts` → `create` | Basse | Accusé de réception simple |
| T5 | Événement approuvé / rejeté | `event-validation.controller.ts` → `approveEvent` / `rejectEvent` | Haute | Déclencheur clair et déjà identifié, prêt à implémenter |
| T6 | Compte organisateur vérifié / rejeté | `event-validation.controller.ts` → `verifyOrganizer` | Haute | Idem T5, déclencheur clair |
| T7 | Événement annulé — notifier tous les détenteurs de billets | `event.controller.ts` → `cancel` | Moyenne | Plus complexe : nécessite d'itérer sur tous les `event_ticket` de l'événement, envoi en masse — prévoir un throttle/queue plutôt qu'un `Promise.all` naïf si l'événement a beaucoup de billets |

---

## 6. Backlog — Paiements / Wallet (transversal)

Fichiers clés : [src/controllers/payment.controller.ts](src/controllers/payment.controller.ts),
[src/repository/wallet.repository.ts](src/repository/wallet.repository.ts).

| # | Cas d'usage | Déclencheur (fonction) | Priorité | Notes |
|---|---|---|---|---|
| P1 | Rechargement wallet confirmé | `payment.controller.ts` → `webhook` (après confirmation Orange Money/MTN) | Moyenne | |
| P2 | Paiement échoué | `webhook` (statut échec) | Basse | Utile mais pas critique, l'app affiche déjà l'échec en direct |

---

## Ordre suggéré pour la suite

Par valeur/effort : **T5, T6** (déclencheurs déjà identifiés, logique triviale)
→ **V3** (reçu de course) → **B1, B2** (cœur du produit) → **T1** (nécessite
de clarifier le flux QR code d'abord) → le reste selon besoin produit.

Les cas "rappel avant événement/départ" (B3, T3) sont à part : ils
nécessitent un vrai scheduler (cron), pas juste un appel synchrone dans un
controller — regarder `tripScheduler.service.ts` comme référence existante
avant d'en écrire un nouveau.
