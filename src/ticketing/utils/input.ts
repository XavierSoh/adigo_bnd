/**
 * Lecture et validation des corps de requête des écrans de gestion
 * (adigo2). Chaque lecteur renvoie la valeur normalisée, `undefined` si le
 * champ est absent, ou ajoute une erreur lisible à `errors`.
 */
import { parseZonedDate } from "./ticketing-rules";

export class InputReader {
    readonly errors: string[] = [];

    constructor(private readonly body: Record<string, unknown>) {}

    has(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.body ?? {}, key);
    }

    string(key: string, label: string, opts: { required?: boolean; max?: number } = {}): string | null | undefined {
        if (!this.has(key)) {
            if (opts.required) this.errors.push(`${label} est obligatoire`);
            return undefined;
        }
        const raw = this.body[key];
        if (raw === null || raw === '') {
            if (opts.required) this.errors.push(`${label} est obligatoire`);
            return null;
        }
        if (typeof raw !== 'string') {
            this.errors.push(`${label} doit être un texte`);
            return undefined;
        }
        const value = raw.trim();
        if (opts.required && !value) {
            this.errors.push(`${label} est obligatoire`);
            return undefined;
        }
        if (opts.max && value.length > opts.max) {
            this.errors.push(`${label} : ${opts.max} caractères maximum`);
            return undefined;
        }
        return value || null;
    }

    int(key: string, label: string, opts: { required?: boolean; min?: number; max?: number } = {}): number | null | undefined {
        if (!this.has(key) || this.body[key] === null || this.body[key] === '') {
            if (opts.required) this.errors.push(`${label} est obligatoire`);
            return this.has(key) ? null : undefined;
        }
        const n = Number(this.body[key]);
        if (!Number.isInteger(n)) {
            this.errors.push(`${label} doit être un nombre entier`);
            return undefined;
        }
        if (opts.min !== undefined && n < opts.min) {
            this.errors.push(`${label} doit être au moins ${opts.min}`);
            return undefined;
        }
        if (opts.max !== undefined && n > opts.max) {
            this.errors.push(`${label} doit être au plus ${opts.max}`);
            return undefined;
        }
        return n;
    }

    decimal(key: string, label: string, opts: { min?: number; max?: number } = {}): number | null | undefined {
        if (!this.has(key)) return undefined;
        const raw = this.body[key];
        if (raw === null || raw === '') return null;
        const n = Number(raw);
        if (!Number.isFinite(n)) {
            this.errors.push(`${label} doit être un nombre`);
            return undefined;
        }
        if ((opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max)) {
            this.errors.push(`${label} doit être compris entre ${opts.min} et ${opts.max}`);
            return undefined;
        }
        return Math.round(n * 100) / 100;
    }

    bool(key: string): boolean | undefined {
        if (!this.has(key)) return undefined;
        const raw = this.body[key];
        return raw === true || raw === 'true' || raw === 1 || raw === '1';
    }

    date(key: string, label: string, opts: { required?: boolean } = {}): Date | null | undefined {
        if (!this.has(key) || this.body[key] === null || this.body[key] === '') {
            if (opts.required) this.errors.push(`${label} est obligatoire`);
            return this.has(key) ? null : undefined;
        }
        const parsed = parseZonedDate(this.body[key]);
        if (parsed === 'invalid') {
            this.errors.push(`${label} : date ISO 8601 avec fuseau horaire attendue (ex. 2026-11-02T19:00:00.000Z)`);
            return undefined;
        }
        return parsed;
    }

    stringArray(key: string, label: string): string[] | undefined {
        if (!this.has(key)) return undefined;
        const raw = this.body[key];
        if (raw === null) return [];
        if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) {
            this.errors.push(`${label} doit être une liste de textes`);
            return undefined;
        }
        return (raw as string[]).map((v) => v.trim()).filter(Boolean);
    }

    get ok(): boolean {
        return this.errors.length === 0;
    }

    get message(): string {
        return this.errors.join(' · ');
    }
}

/** `undefined` = ne pas toucher au champ (mise à jour partielle). */
export function defined<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
