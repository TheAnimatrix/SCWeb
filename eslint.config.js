import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	eslintConfigPrettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				Razorpay: 'readonly'
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		files: ['src/lib/components/ModelViewer.svelte'],
		rules: {
			'svelte/no-dom-manipulating': 'off'
		}
	},
	{
		ignores: [
			'.DS_Store',
			'node_modules',
			'build',
			'.svelte-kit',
			'package',
			'dev-dist',
			'api/dist',
			'api/drizzle',
			'.vercel',
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock'
		]
	}
);
