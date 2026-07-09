import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function resolveEnvRoot(cwd = process.cwd()): string {
	if (existsSync(resolve(cwd, '.env.local')) || existsSync(resolve(cwd, '.env'))) {
		return cwd;
	}

	const parent = resolve(cwd, '..');
	if (existsSync(resolve(parent, '.env.local')) || existsSync(resolve(parent, '.env'))) {
		return parent;
	}

	return cwd;
}

/** Load repo-root env files; later files override earlier ones (matches Vite / SvelteKit). */
export function loadEnvFiles(cwd = process.cwd()): void {
	const root = resolveEnvRoot(cwd);

	for (const file of ['.env', '.env.local']) {
		config({ path: resolve(root, file), override: true });
	}

	config({ path: resolve(cwd, '.env'), override: true });
}
