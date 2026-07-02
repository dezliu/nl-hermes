import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

let loaded = false;

function findEnvFile(startDir = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Load monorepo root `.env` without overriding existing process env. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const envPath = findEnvFile();
  if (!envPath) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
