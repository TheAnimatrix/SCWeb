import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
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
				enabled: true
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
