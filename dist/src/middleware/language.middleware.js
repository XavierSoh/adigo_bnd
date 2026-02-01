"use strict";
/**
 * Middleware pour détecter et injecter la langue de l'utilisateur
 * La langue sera disponible dans req.lang
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageMiddleware = void 0;
const i18n_1 = require("../utils/i18n");
/**
 * Middleware de détection de langue
 * Détecte la langue à partir de:
 * 1. req.body.lang
 * 2. req.query.lang
 * 3. req.headers['accept-language']
 * 4. Défaut: 'en'
 */
const languageMiddleware = (req, res, next) => {
    req.lang = i18n_1.I18n.detectLanguage(req);
    next();
};
exports.languageMiddleware = languageMiddleware;
