import { describe, expect, it } from 'vitest';
import {
	getDocPage,
	getDocsMeta,
	listDocPages,
	parseFrontmatter,
	renderMarkdown,
	slugifyHeading
} from './content';

describe('parseFrontmatter', () => {
	it('reads title, description and order and returns the body', () => {
		const { data, body } = parseFrontmatter(
			'---\ntitle: Getting started\ndescription: Set up the IDE.\norder: 2\n---\n\n# Hello\n'
		);
		expect(data).toEqual({ title: 'Getting started', description: 'Set up the IDE.', order: 2 });
		expect(body).toBe('\n# Hello\n');
	});

	it('strips single and double quotes and keeps colons in values', () => {
		const { data } = parseFrontmatter(
			"---\ntitle: \"Pinout: the full table\"\ndescription: 'It's here'\n---\nBody"
		);
		expect(data.title).toBe('Pinout: the full table');
		expect(data.description).toBe("It's here");
	});

	it('handles CRLF line endings and ignores unknown keys and bad orders', () => {
		const { data, body } = parseFrontmatter(
			'---\r\ntitle: A\r\nauthor: B\r\norder: soon\r\n---\r\nText'
		);
		expect(data).toEqual({ title: 'A' });
		expect(body).toBe('Text');
	});

	it('returns the whole source when there is no frontmatter', () => {
		expect(parseFrontmatter('# Title\n\nText')).toEqual({ data: {}, body: '# Title\n\nText' });
	});
});

describe('slugifyHeading', () => {
	it('matches GitHub-style anchors', () => {
		expect(slugifyHeading('The R16 story')).toBe('the-r16-story');
		expect(slugifyHeading('The port disappears, or Serial goes quiet')).toBe(
			'the-port-disappears-or-serial-goes-quiet'
		);
		expect(slugifyHeading('01_BlinkAndBattery')).toBe('01_blinkandbattery');
		expect(slugifyHeading('sleepUntilPin()')).toBe('sleepuntilpin');
	});
});

describe('renderMarkdown', () => {
	it('gives h2 and h3 stable ids and collects them as headings', async () => {
		const { html, headings } = await renderMarkdown(
			'# Title\n\n## What you need\n\n### `begin()`\n\n#### Small print\n'
		);
		expect(html).toContain('<h1>Title</h1>');
		expect(html).toContain(
			'<h2 id="what-you-need">What you need<a class="heading-anchor" href="#what-you-need"'
		);
		expect(html).toContain('<h3 id="begin"><code>begin()</code>');
		expect(html).toContain('<h4>Small print</h4>');
		expect(headings).toEqual([
			{ depth: 2, id: 'what-you-need', text: 'What you need' },
			{ depth: 3, id: 'begin', text: 'begin()' }
		]);
	});

	it('de-duplicates heading ids', async () => {
		const { headings } = await renderMarkdown('## Setup\n\n## Setup\n\n### Setup\n\n## ???\n');
		expect(headings.map((heading) => heading.id)).toEqual([
			'setup',
			'setup-1',
			'setup-2',
			'section'
		]);
	});

	it('decodes entities in heading text', async () => {
		const { headings } = await renderMarkdown('## Power & battery\n');
		expect(headings[0]).toEqual({ depth: 2, id: 'power--battery', text: 'Power & battery' });
	});

	it('wraps tables in a docs-table div', async () => {
		const { html } = await renderMarkdown('| Pin | Use |\n|---|---|\n| 13 | DIO0 |\n');
		expect(html).toMatch(/^<div class="docs-table"><table>/);
		expect(html).toContain('<td>DIO0</td>');
		expect(html.trim()).toMatch(/<\/table>\s*<\/div>$/);
	});

	it('highlights known languages with shiki and maps arduino to cpp', async () => {
		const cpp = await renderMarkdown('```cpp\n#include <LorNode.h>\nint x = 1;\n```\n');
		expect(cpp.html).toContain('<pre class="shiki github-dark-default"');
		expect(cpp.html).toContain('<span style="color:');
		expect(cpp.html).toContain('&#x3C;LorNode.h>');

		const arduino = await renderMarkdown('```arduino\nvoid setup() {}\n```\n');
		expect(arduino.html).toContain('<pre class="shiki github-dark-default"');

		const json = await renderMarkdown('```json\n{"a":1}\n```\n');
		expect(json.html).toContain('<pre class="shiki github-dark-default"');
	});

	it('renders unknown or missing languages as plain escaped code', async () => {
		const unknown = await renderMarkdown('```brainfuck\n<b>&\n```\n');
		expect(unknown.html).toBe('<pre><code>&lt;b&gt;&amp;</code></pre>\n');
		expect(unknown.html).not.toContain('shiki');

		const plain = await renderMarkdown('```\nVIN <--- 5V\n```\n');
		expect(plain.html).toBe('<pre><code>VIN &lt;--- 5V</code></pre>\n');
	});

	it('opens external links in a new tab and leaves internal links alone', async () => {
		const { html } = await renderMarkdown(
			'[Arduino](https://www.arduino.cc/en/software) and [Pinout](/docs/lornode/pinout) and [Top](#top)'
		);
		expect(html).toContain(
			'<a target="_blank" rel="noopener noreferrer" href="https://www.arduino.cc/en/software">Arduino</a>'
		);
		expect(html).toContain('<a href="/docs/lornode/pinout">Pinout</a>');
		expect(html).toContain('<a href="#top">Top</a>');
	});
});

describe('committed LorNode docs', () => {
	it('lists pages in order with the index first', () => {
		const pages = listDocPages('lornode');
		expect(pages[0]).toMatchObject({ slug: '', title: 'Overview', order: 1 });
		expect(pages.map((page) => page.slug)).toContain('pinout');
		const orders = pages.map((page) => page.order);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
		expect(listDocPages('nope')).toEqual([]);
	});

	it('renders a page with prev/next links and returns null for unknown pages', async () => {
		const pinout = await getDocPage('lornode', 'pinout');
		expect(pinout?.title).toBe('Pinout');
		expect(pinout?.html).toContain('src="/images/lornode/');
		expect(pinout?.prev).not.toBeNull();
		expect(await getDocPage('lornode', 'pinout')).toBe(pinout);
		expect(await getDocPage('lornode', 'nope')).toBeNull();
		expect(await getDocPage('nope', '')).toBeNull();
	});

	it('exposes the sync metadata', () => {
		expect(getDocsMeta('lornode')).toMatchObject({
			repoUrl: 'https://github.com/TheAnimatrix/LorNode',
			commit: expect.stringMatching(/^[0-9a-f]{40}$/)
		});
		expect(getDocsMeta('nope')).toBeNull();
	});
});
