/** @type {import('tailwindcss').Config}*/

import { join } from 'path';
// 1. Import the Skeleton plugin
import { skeleton } from '@skeletonlabs/tw-plugin';
const colors = require('tailwindcss/colors')
const config = {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		// 3. Append the path to the Skeleton package
		join(require.resolve(
			'@skeletonlabs/skeleton'),
			'../**/*.{html,js,svelte,ts}'
		)
	],
	theme: {
		extend: {
		  fontFamily: {
			'figtree': ['figtree', 'sans-serif'],
		  },
		},
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			black: colors.black,
			white: colors.white,
			orange:colors.orange,
			gray: colors.gray,
			slate: colors.slate,
			green: colors.emerald,
			purple: colors.violet,
			yellow: colors.amber,
			pink: colors.pink,
			scbg: "#232323",
			scbgl1: "#2c2c2c",
			scbgl2: "#343434",
			scbgl3: "#383838",
			scpurple: '#9039FF',
		}
	},
	plugins: [
		// 4. Append the Skeleton plugin (after other plugins)
		skeleton
	]
};

module.exports = config;
