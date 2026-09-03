#!/usr/bin/env node
/**
 * Copies build-time static assets that `tsc` doesn't handle, into dist/.
 * Cross-platform (replaces the old cp/xcopy shell fallback in package.json).
 *
 * - src/public -> dist/public (home page HTML served by app.ts)
 * - src/migrations/**\/*.sql -> dist/src/migrations/**\/*.sql
 *   (migration runners do fs.readFileSync(path.join(__dirname, '<file>.sql'))
 *   at runtime against the compiled __dirname, i.e. dist/src/migrations/...;
 *   tsc only emits .js from .ts and silently drops the raw .sql files, so
 *   without this copy every migration script "succeeds" while skipping
 *   every step with "File not found" - reproduced and fixed 2026-09-03.)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function copyDir(src, dest, filter) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(s, d, filter);
        } else if (!filter || filter(entry.name)) {
            fs.copyFileSync(s, d);
        }
    }
}

copyDir(path.join(root, 'src/public'), path.join(root, 'dist/public'));
copyDir(
    path.join(root, 'src/migrations'),
    path.join(root, 'dist/src/migrations'),
    (name) => name.endsWith('.sql')
);

console.log('Copied static assets (public/, migration .sql files) into dist/');
