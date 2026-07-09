import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	// Pre-bundle UI libs at dev-server start so the first visit to a page that
	// uses bits-ui / iconify / drawers does not trigger a mid-session dep reload
	// (that reload corrupts Svelte's effect tree and throws get_next_sibling errors).
	optimizeDeps: {
		include: [
			'bits-ui',
			'vaul-svelte',
			'@iconify/svelte',
			'@floating-ui/dom',
			'@floating-ui/core',
			'tabbable',
			'@internationalized/date',
			'style-to-object',
			'svelte-toolbelt',
			'runed',
			'@supabase/ssr',
			'@supabase/supabase-js',
			'devalue',
			'@sentry/sveltekit',
			// Route-local deps added during the 2026-07 overhaul — each one, when
			// first discovered on a route visit, forced a mid-session re-optimize
			// + full reload (mixed ?v= chunk hashes, get_next_sibling crashes).
			'dompurify',
			'bad-words',
			'snarkdown',
			'uuid',
			'three',
			'three/addons/controls/OrbitControls.js',
			'three/addons/environments/RoomEnvironment.js',
			'three/addons/loaders/3MFLoader.js',
			'three/addons/loaders/OBJLoader.js',
			'three/addons/loaders/STLLoader.js',
			'three/examples/jsm/loaders/3MFLoader.js',
			'three/examples/jsm/loaders/STLLoader.js'
		],
		// Iconify loads icons on demand; no pre-bundling needed.
	},
	resolve: {
		dedupe: ['svelte']
	},
	server: {
		warmup: {
			clientFiles: [
				'./src/routes/+layout.svelte',
				'./src/routes/+layout.ts',
				'./src/lib/components/ui/**/*.svelte',
				'./src/lib/components/product/**/*.svelte',
				'./src/lib/components/sc/**/*.svelte',
				'./src/lib/components/fundamental/HTMLWrapper.svelte',
				'./src/routes/[craft_name]/craft/item=[item]/+page.svelte',
				'./src/routes/crafts/+page.svelte',
				'./src/routes/+page.svelte',
				'./src/routes/3dp-portal/**/*.svelte'
			]
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Selfcrafted India',
				short_name: 'Selfcrafted',
				description:
					'Selfcrafted India is a platform for indie creators to sell their products directly to customers.',
				theme_color: '#000000',
				background_color: '#000000',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/pwa/pwa-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa/pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa/pwa-maskable-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'maskable'
					},
					{
						src: '/pwa/pwa-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					},
					{
						src: '/pwa/pwa-monochrome-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'monochrome'
					},
					{
						src: '/pwa/pwa-monochrome-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'monochrome'
					},
					{
						src: '/apple-touch-icon.png',
						sizes: '180x180',
						type: 'image/png'
					}
				]
			},
			devOptions: {
				// Workbox 7.4 + Vite 6 fail to bundle the dev service worker (source-phase import error).
				enabled: false
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
