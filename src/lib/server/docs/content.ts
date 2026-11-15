// Product docs: markdown synced from each product's repo by scripts/sync-product-docs.mjs.
//
// The markdown is first-party content committed to this repo (not user input), so the
// rendered HTML is trusted and rendered with {@html} without sanitising.

import { Marked, Renderer, type Tokens } from 'marked';
import type { HighlighterCore } from 'shiki/core';

export interface DocHeading {
	depth: 2 | 3;
	id: string;
	text: string;
}

export interface DocPageSummary {
	slug: string;
	title: string;
	description: string;
	order: number;
}

export interface DocPageLink {
	slug: string;
	title: string;
}

export interface DocPage {
	slug: string;
	title: string;
	description: string;
	html: string;
	headings: DocHeading[];
	prev: DocPageLink | null;
	next: DocPageLink | null;
}

export interface DocsMeta {
	repoUrl: string;
	commit: string;
	syncedAt: string;
}

export interface Frontmatter {
	title?: string;
	description?: string;
	order?: number;
}

export interface RenderedMarkdown {
	html: string;
	headings: DocHeading[];
}

const markdownFiles = import.meta.glob<string>('/src/content/docs/*/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

const metaFiles = import.meta.glob<DocsMeta>('/src/content/docs/*/_meta.json', {
	import: 'default',
	eager: true
});

const CONTENT_PATH = /^\/src\/content\/docs\/([^/]+)\/([^/]+)\.(md|json)$/;

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

function stripQuotes(value: string): string {
	const quoted = value.match(/^(["'])([\s\S]*)\1$/);
	return quoted ? quoted[2] : value;
}

/** Parses simple `key: value` frontmatter (title, description, order). */
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
	const normalised = source.replace(/\r\n/g, '\n');
	const match = normalised.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
	if (!match) return { data: {}, body: normalised };

	const data: Frontmatter = {};
	for (const line of match[1].split('\n')) {
		const field = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
		if (!field) continue;
		const [, key, rawValue] = field;
		const value = stripQuotes(rawValue.trim());
		if (key === 'title' || key === 'description') {
			data[key] = value;
		} else if (key === 'order') {
			const order = Number(value);
			if (value !== '' && Number.isFinite(order)) data.order = order;
		}
	}

	return { data, body: normalised.slice(match[0].length) };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

const SHIKI_THEME = 'github-dark-default';
const LANGUAGE_ALIASES: Record<string, string> = { arduino: 'cpp', ino: 'cpp' };

let highlighterPromise: Promise<HighlighterCore> | null = null;

/** Creates the shiki highlighter once, on first use. */
function getHighlighter(): Promise<HighlighterCore> {
	highlighterPromise ??= (async () => {
		const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
			import('shiki/core'),
			import('shiki/engine/javascript')
		]);
		return createHighlighterCore({
			themes: [import('shiki/themes/github-dark-default.mjs')],
			// shellscript also registers the bash, sh and shell aliases.
			langs: [
				import('shiki/langs/cpp.mjs'),
				import('shiki/langs/c.mjs'),
				import('shiki/langs/shellscript.mjs'),
				import('shiki/langs/json.mjs'),
				import('shiki/langs/ini.mjs'),
				import('shiki/langs/yaml.mjs')
			],
			engine: createJavaScriptRegexEngine()
		});
	})().catch((error) => {
		highlighterPromise = null;
		throw error;
	});
	return highlighterPromise;
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'"
};

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(char) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[char]};`
	);
}

function decodeEntities(value: string): string {
	return value.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);
}

/** GitHub-style heading slug, so anchors written against GitHub keep working. */
export function slugifyHeading(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, '')
		.replace(/\s/g, '-');
}

/** Renders docs markdown to HTML and collects h2/h3 headings for the table of contents. */
export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
	const highlighter = await getHighlighter();
	const loadedLanguages = new Set(highlighter.getLoadedLanguages());
	const headings: DocHeading[] = [];
	const usedIds = new Map<string, number>();

	const uniqueId = (text: string) => {
		const base = slugifyHeading(text) || 'section';
		const seen = usedIds.get(base) ?? 0;
		usedIds.set(base, seen + 1);
		return seen === 0 ? base : `${base}-${seen}`;
	};

	class DocsRenderer extends Renderer {
		heading({ tokens, depth }: Tokens.Heading): string {
			const html = this.parser.parseInline(tokens);
			if (depth !== 2 && depth !== 3) return `<h${depth}>${html}</h${depth}>\n`;
			const text = decodeEntities(this.parser.parseInline(tokens, this.parser.textRenderer)).trim();
			const id = uniqueId(text);
			headings.push({ depth, id, text });
			return `<h${depth} id="${id}">${html}<a class="heading-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a></h${depth}>\n`;
		}

		code({ text, lang }: Tokens.Code): string {
			const requested = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
			const language = LANGUAGE_ALIASES[requested] ?? requested;
			if (language && loadedLanguages.has(language)) {
				return highlighter.codeToHtml(text, { lang: language, theme: SHIKI_THEME }) + '\n';
			}
			return `<pre><code>${escapeHtml(text)}</code></pre>\n`;
		}

		table(token: Tokens.Table): string {
			return `<div class="docs-table">${super.table(token)}</div>\n`;
		}

		link(token: Tokens.Link): string {
			const html = super.link(token);
			return token.href.startsWith('http')
				? html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ')
				: html;
		}
	}

	// setOptions keeps the subclass as-is; `use({ renderer })` only copies own properties.
	const marked = new Marked().setOptions({
		gfm: true,
		async: false,
		renderer: new DocsRenderer()
	});
	const html = marked.parse(markdown) as string;
	return { html, headings };
}

// ---------------------------------------------------------------------------
// Content index
// ---------------------------------------------------------------------------

interface SourcePage extends DocPageSummary {
	body: string;
}

function firstH1(body: string): string | undefined {
	return body.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1];
}

function buildIndex(): Map<string, SourcePage[]> {
	const index = new Map<string, SourcePage[]>();
	for (const [path, source] of Object.entries(markdownFiles)) {
		const match = path.match(CONTENT_PATH);
		if (!match) continue;
		const [, product, file] = match;
		const { data, body } = parseFrontmatter(source);
		const slug = file === 'index' ? '' : file;
		const pages = index.get(product) ?? [];
		pages.push({
			slug,
			title: data.title ?? firstH1(body) ?? (slug || 'Overview'),
			description: data.description ?? '',
			order: data.order ?? (slug === '' ? 0 : Number.MAX_SAFE_INTEGER),
			body
		});
		index.set(product, pages);
	}
	for (const pages of index.values()) {
		pages.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
	}
	return index;
}

const contentIndex = buildIndex();
const renderedPages = new Map<string, Promise<DocPage | null>>();

/** All pages of a product's docs, sorted by frontmatter `order`. `index.md` has slug `''`. */
export function listDocPages(productSlug: string): DocPageSummary[] {
	return (contentIndex.get(productSlug) ?? []).map(({ slug, title, description, order }) => ({
		slug,
		title,
		description,
		order
	}));
}

async function loadDocPage(productSlug: string, pageSlug: string): Promise<DocPage | null> {
	const pages = contentIndex.get(productSlug) ?? [];
	const position = pages.findIndex((candidate) => candidate.slug === pageSlug);
	if (position === -1) return null;

	const page = pages[position];
	const { html, headings } = await renderMarkdown(page.body);
	const link = (target: SourcePage | undefined): DocPageLink | null =>
		target ? { slug: target.slug, title: target.title } : null;

	return {
		slug: page.slug,
		title: page.title,
		description: page.description,
		html,
		headings,
		prev: link(pages[position - 1]),
		next: link(pages[position + 1])
	};
}

/** A rendered docs page, or null when the product or page does not exist. Memoised. */
export async function getDocPage(productSlug: string, pageSlug: string): Promise<DocPage | null> {
	// Unknown slugs are not cached, so random URLs cannot grow the memo.
	const exists = contentIndex.get(productSlug)?.some((candidate) => candidate.slug === pageSlug);
	if (!exists) return null;

	const key = `${productSlug}/${pageSlug}`;
	let page = renderedPages.get(key);
	if (!page) {
		page = loadDocPage(productSlug, pageSlug).catch((error) => {
			renderedPages.delete(key);
			throw error;
		});
		renderedPages.set(key, page);
	}
	return page;
}

/** Sync metadata (source repo, commit, sync time) for a product's docs. */
export function getDocsMeta(productSlug: string): DocsMeta | null {
	for (const [path, meta] of Object.entries(metaFiles)) {
		const match = path.match(CONTENT_PATH);
		if (match && match[1] === productSlug) return meta;
	}
	return null;
}
