import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({ runtime: 'nodejs22.x' }),
		serviceWorker: {
			register: false
		},
		alias: {
			$pages: path.resolve('./src/routes'),
			'@scweb/api': path.resolve('./api/src/index.ts'),
			'@scweb/api/client': path.resolve('./api/src/client.ts')
		}
	}
};

export default config;
