/**
 * Middleware pour détecter et injecter la langue de l'utilisateur
 * La langue sera disponible dans req.lang
 */

import { Request, Response, NextFunction } from 'express';
import { I18n, Language } from '../utils/i18n';

// Extend Express Request type to include lang property
declare global {
    namespace Express {
        interface Request {
            lang: Language;
        }
    }
}

/**
 * Middleware de détection de langue
 * Détecte la langue à partir de:
 * 1. req.body.lang
 * 2. req.query.lang
 * 3. req.headers['accept-language']
 * 4. Défaut: 'en'
 */
export const languageMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    req.lang = I18n.detectLanguage(req);
    next();
};
