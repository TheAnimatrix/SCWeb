import { config } from 'dotenv';
import { resolve } from 'node:path';

/** Load repo-root env files; later files override earlier ones (matches Vite / SvelteKit). */
export function loadEnvFiles(cwd = process.cwd()): void {
	const root = resolve(cwd, '..');
	for (const file of ['.env', '.env.local']) {
		config({ path: resolve(root, file), override: true });
	}
	config({ path: resolve(cwd, '.env'), override: true });
}
