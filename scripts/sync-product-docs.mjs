#!/usr/bin/env node
// Copies a product's docs (docs/*.md) from its source repo into scweb.
//
// Usage:
//   node scripts/sync-product-docs.mjs <productSlug> <pathToRepo> [--repo-url <url>] [--branch <name>]
//
// Writes src/content/docs/<productSlug>/*.md (links rewritten for selfcrafted.in),
// copies referenced images into static/images/<productSlug>/, and records the
// source commit in src/content/docs/<productSlug>/_meta.json.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { rewriteDocLinks } from '../src/lib/docs/rewriteLinks.js';

const DEFAULT_REPO_URL = 'https://github.com/TheAnimatrix/LorNode';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage(message) {
	if (message) console.error(`Error: ${message}\n`);
	console.error(
		'Usage: node scripts/sync-product-docs.mjs <productSlug> <pathToRepo> [--repo-url <url>] [--branch <name>]'
	);
	process.exit(1);
}

function parseArgs(argv) {
	const positional = [];
	let repoUrl = DEFAULT_REPO_URL;
	let branch = 'main';
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--repo-url' || arg === '--branch') {
			const value = argv[i + 1];
			if (!value) usage(`${arg} needs a value`);
			if (arg === '--repo-url') repoUrl = value.replace(/\/+$/, '');
			else branch = value;
			i += 1;
		} else if (arg.startsWith('--')) {
			usage(`unknown option ${arg}`);
		} else {
			positional.push(arg);
		}
	}
	if (positional.length !== 2) usage();
	const [productSlug, repoPath] = positional;
	if (!/^[a-z0-9][a-z0-9-]*$/.test(productSlug)) {
		usage('productSlug must be lowercase letters, digits and hyphens');
	}
	return { productSlug, repoPath: path.resolve(repoPath), repoUrl, branch };
}

/**
 * Formats generated files with the repo's Prettier config so `npm run lint` stays clean.
 * Code samples inside the markdown are left exactly as written.
 */
async function format(filePath, source) {
	const config = (await prettier.resolveConfig(filePath)) ?? {};
	return prettier.format(source, {
		...config,
		filepath: filePath,
		embeddedLanguageFormatting: 'off'
	});
}

async function main() {
	const { productSlug, repoPath, repoUrl, branch } = parseArgs(process.argv.slice(2));
	const docsDir = path.join(repoPath, 'docs');
	if (!existsSync(docsDir)) usage(`no docs/ folder in ${repoPath}`);

	const sourceFiles = (await readdir(docsDir)).filter((name) => name.endsWith('.md')).sort();
	if (sourceFiles.length === 0) usage(`no .md files in ${docsDir}`);

	const outDir = path.join(ROOT, 'src', 'content', 'docs', productSlug);
	const imageDir = path.join(ROOT, 'static', 'images', productSlug);
	await mkdir(outDir, { recursive: true });
	await mkdir(imageDir, { recursive: true });

	for (const name of await readdir(outDir)) {
		if (name.endsWith('.md')) await rm(path.join(outDir, name));
	}

	const assets = new Set();
	for (const name of sourceFiles) {
		const source = await readFile(path.join(docsDir, name), 'utf8');
		const result = rewriteDocLinks(source.replace(/\r\n/g, '\n'), {
			productSlug,
			repoUrl,
			branch
		});
		result.assets.forEach((asset) => assets.add(asset));
		const target = path.join(outDir, name);
		await writeFile(target, await format(target, result.markdown));
	}

	// PNG twins of the pinout SVGs, for places that cannot show SVG.
	const pinoutDir = path.join(repoPath, 'pinout');
	if (existsSync(pinoutDir)) {
		for (const name of await readdir(pinoutDir)) {
			if (!name.endsWith('.svg')) continue;
			const twin = `pinout/${name.replace(/\.svg$/, '.png')}`;
			if (existsSync(path.join(repoPath, twin))) assets.add(twin);
		}
	}

	const copied = [];
	const missing = [];
	for (const asset of [...assets].sort()) {
		const from = path.join(repoPath, asset);
		if (!existsSync(from)) {
			missing.push(asset);
			continue;
		}
		const fileName = path.posix.basename(asset);
		await copyFile(from, path.join(imageDir, fileName));
		copied.push(fileName);
	}

	const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
		cwd: repoPath,
		encoding: 'utf8'
	}).trim();
	const meta = { repoUrl, commit, syncedAt: new Date().toISOString() };
	const metaPath = path.join(outDir, '_meta.json');
	await writeFile(metaPath, await format(metaPath, JSON.stringify(meta)));

	const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
	console.log(`Synced ${productSlug} docs from ${repoPath}`);
	console.log(`  commit:  ${commit}`);
	console.log(`  pages:   ${sourceFiles.length} -> ${rel(outDir)}/`);
	for (const name of sourceFiles) console.log(`           ${name}`);
	console.log(`  images:  ${copied.length} -> ${rel(imageDir)}/`);
	for (const name of copied) console.log(`           ${name}`);
	if (missing.length) {
		console.warn(`  missing: ${missing.length} referenced image(s) not found in the repo`);
		for (const asset of missing) console.warn(`           ${asset}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
