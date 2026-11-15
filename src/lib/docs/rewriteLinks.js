// Rewrites relative links in product docs markdown so they work on selfcrafted.in.
// Plain ESM JavaScript (with JSDoc types) so the Node sync script and Vitest can share it.

/**
 * @typedef {object} RewriteOptions
 * @property {string} productSlug Docs slug, e.g. `lornode`.
 * @property {string} repoUrl GitHub repo URL, e.g. `https://github.com/TheAnimatrix/LorNode`.
 * @property {string} [branch] Branch used for GitHub blob/tree links. Defaults to `main`.
 */

/**
 * @typedef {object} RewriteResult
 * @property {string} markdown The rewritten markdown.
 * @property {string[]} assets Repo-relative paths of images to copy into `static/images/<productSlug>/`.
 */

const IMAGE_EXTENSION = /\.(svg|png|jpe?g|webp|gif|avif)$/i;
const FILE_EXTENSION = /\.[a-z0-9]+$/i;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
// Private-use characters mark stashed inline code; they never appear in real docs.
const PLACEHOLDER = /(\d+)/g;

/** Directory, relative to the repo root, that holds the docs markdown. */
const DOCS_DIR = 'docs';

/**
 * Resolves `target` against `DOCS_DIR` with POSIX semantics.
 * Returns null when the path escapes the repo root.
 * @param {string} target
 * @returns {string | null}
 */
function resolveRepoPath(target) {
	const parts = [DOCS_DIR];
	for (const segment of target.split('/')) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') {
			if (parts.length === 0) return null;
			parts.pop();
		} else {
			parts.push(segment);
		}
	}
	return parts.join('/');
}

/**
 * Rewrites one link destination. Returns the new destination, or the original when unchanged.
 * @param {string} url
 * @param {Required<RewriteOptions>} options
 * @param {Set<string>} assets
 * @returns {string}
 */
function rewriteUrl(url, options, assets) {
	if (!url || url.startsWith('#') || url.startsWith('/') || SCHEME.test(url)) return url;

	const suffixStart = url.search(/[?#]/);
	const path = suffixStart === -1 ? url : url.slice(0, suffixStart);
	const suffix = suffixStart === -1 ? '' : url.slice(suffixStart);
	if (!path) return url;

	const repoPath = resolveRepoPath(path);
	if (repoPath === null || repoPath === '') return url;

	const docsPrefix = `${DOCS_DIR}/`;
	const docName = repoPath.startsWith(docsPrefix) ? repoPath.slice(docsPrefix.length) : null;
	if (docName && !docName.includes('/') && docName.endsWith('.md')) {
		const page = docName.slice(0, -'.md'.length);
		const base = `/docs/${options.productSlug}`;
		return `${page === 'index' ? base : `${base}/${page}`}${suffix}`;
	}

	if (IMAGE_EXTENSION.test(repoPath)) {
		assets.add(repoPath);
		const fileName = repoPath.slice(repoPath.lastIndexOf('/') + 1);
		return `/images/${options.productSlug}/${fileName}${suffix}`;
	}

	const repoUrl = options.repoUrl.replace(/\/+$/, '');
	const kind = FILE_EXTENSION.test(repoPath) ? 'blob' : 'tree';
	return `${repoUrl}/${kind}/${options.branch}/${repoPath}${suffix}`;
}

/**
 * Replaces inline code spans with placeholders so links inside them are left alone.
 * @param {string} text
 * @param {string[]} stash
 * @returns {string}
 */
function stashInlineCode(text, stash) {
	let out = '';
	let index = 0;
	while (index < text.length) {
		const open = text.indexOf('`', index);
		if (open === -1) break;
		let runEnd = open;
		while (text[runEnd] === '`') runEnd += 1;
		const run = text.slice(open, runEnd);

		let close = -1;
		let search = runEnd;
		while (search < text.length) {
			const candidate = text.indexOf(run, search);
			if (candidate === -1) break;
			let candidateEnd = candidate + run.length;
			if (text[candidateEnd] === '`') {
				while (text[candidateEnd] === '`') candidateEnd += 1;
				search = candidateEnd;
				continue;
			}
			close = candidate;
			break;
		}

		if (close === -1) {
			out += text.slice(index, runEnd);
			index = runEnd;
			continue;
		}

		const end = close + run.length;
		out += text.slice(index, open) + `${stash.length}`;
		stash.push(text.slice(open, end));
		index = end;
	}
	return out + text.slice(index);
}

/**
 * Rewrites links in a block of markdown that contains no fenced code.
 * @param {string} text
 * @param {Required<RewriteOptions>} options
 * @param {Set<string>} assets
 * @returns {string}
 */
function rewriteProse(text, options, assets) {
	/** @type {string[]} */
	const stash = [];
	let out = stashInlineCode(text, stash);

	/** @param {string} url */
	const rewrite = (url) => rewriteUrl(url, options, assets);

	// Inline links and images: `[text](dest "title")` and `![alt](dest)`.
	out = out.replace(/\]\(([ \t]*)(<[^>\n]*>|[^)\s]+)/g, (_match, space, dest) =>
		dest.startsWith('<')
			? `](${space}<${rewrite(dest.slice(1, -1))}>`
			: `](${space}${rewrite(dest)}`
	);

	// Reference definitions: `[id]: dest`.
	out = out.replace(/^( {0,3}\[[^\]\n]+\]:[ \t]*)(<[^>\n]*>|\S+)/gm, (_match, prefix, dest) =>
		dest.startsWith('<') ? `${prefix}<${rewrite(dest.slice(1, -1))}>` : `${prefix}${rewrite(dest)}`
	);

	// Raw HTML attributes: `src="x"` and `href="x"`.
	out = out.replace(
		/\b(src|href)=("([^"]*)"|'([^']*)')/g,
		(_match, attr, _quoted, double, single) =>
			double !== undefined ? `${attr}="${rewrite(double)}"` : `${attr}='${rewrite(single)}'`
	);

	return out.replace(PLACEHOLDER, (_match, i) => stash[Number(i)]);
}

/**
 * Rewrites relative links in docs markdown.
 *
 * - `foo.md`, `./foo.md#bar` become `/docs/<productSlug>/foo#bar`; `index.md` becomes `/docs/<productSlug>`.
 * - Relative images (e.g. `../pinout/x.svg`) become `/images/<productSlug>/x.svg` and are listed in `assets`.
 * - Other relative paths become GitHub `blob` (files) or `tree` (folders) links.
 * - Absolute URLs, root-relative paths and `#anchors` are unchanged, as is anything inside code.
 *
 * @param {string} markdown
 * @param {RewriteOptions} options
 * @returns {RewriteResult}
 */
export function rewriteDocLinks(markdown, { productSlug, repoUrl, branch = 'main' }) {
	/** @type {Required<RewriteOptions>} */
	const options = { productSlug, repoUrl, branch };
	/** @type {Set<string>} */
	const assets = new Set();

	const lines = markdown.split('\n');
	/** @type {string[]} */
	const out = [];
	/** @type {string[]} */
	let paragraph = [];
	/** @type {{ char: string, length: number } | null} */
	let fence = null;

	const flush = () => {
		if (paragraph.length) out.push(rewriteProse(paragraph.join('\n'), options, assets));
		paragraph = [];
	};

	for (const line of lines) {
		if (fence) {
			out.push(line);
			const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
			if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
			continue;
		}

		const open = line.match(FENCE_OPEN);
		if (open && !(open[1][0] === '`' && line.slice(open[0].length).includes('`'))) {
			flush();
			fence = { char: open[1][0], length: open[1].length };
			out.push(line);
			continue;
		}

		if (line.trim() === '') {
			flush();
			out.push(line);
			continue;
		}

		paragraph.push(line);
	}
	flush();

	return { markdown: out.join('\n'), assets: [...assets].sort() };
}
