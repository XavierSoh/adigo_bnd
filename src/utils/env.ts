/**
 * Environment variable helpers.
 *
 * Fails fast (at process startup) when a required secret is missing instead
 * of silently falling back to an insecure hardcoded default.
 */

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}. ` +
            `Set it in .env (or the process environment) before starting the server.`
        );
    }
    return value;
}
