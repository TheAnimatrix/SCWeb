import { describe, expect, it } from 'vitest';
import { rewriteDocLinks } from './rewriteLinks.js';

const repoUrl = 'https://github.com/TheAnimatrix/LorNode';
const options = { productSlug: 'lornode', repoUrl };

function rewrite(markdown: string, branch?: string) {
	return rewriteDocLinks(markdown, branch ? { ...options, branch } : options);
}

describe('rewriteDocLinks', () => {
	it('rewrites sibling markdown links to docs routes', () => {
		expect(rewrite('See [Pinout](pinout.md).').markdown).toBe(
			'See [Pinout](/docs/lornode/pinout).'
		);
		expect(rewrite('See [Pinout](./pinout.md).').markdown).toBe(
			'See [Pinout](/docs/lornode/pinout).'
		);
	});

	it('keeps the anchor on markdown links', () => {
		expect(rewrite('[R16](power-and-battery.md#the-r16-story)').markdown).toBe(
			'[R16](/docs/lornode/power-and-battery#the-r16-story)'
		);
	});

	it('maps index.md to the product docs root', () => {
		expect(rewrite('[Home](index.md)').markdown).toBe('[Home](/docs/lornode)');
		expect(rewrite('[Home](./index.md#top)').markdown).toBe('[Home](/docs/lornode#top)');
	});

	it('rewrites pinout images to /images and lists them as assets', () => {
		const result = rewrite('![Pinout](../pinout/lornode-v2-pinout-light.svg)');
		expect(result.markdown).toBe('![Pinout](/images/lornode/lornode-v2-pinout-light.svg)');
		expect(result.assets).toEqual(['pinout/lornode-v2-pinout-light.svg']);
	});

	it('rewrites any other relative image under ../ and links to images', () => {
		const result = rewrite(
			'![Board](../hardware/board.png) and a [dark version](../pinout/dark.svg). ![x](../a/b.webp) ![y](../photo.jpg)'
		);
		expect(result.markdown).toBe(
			'![Board](/images/lornode/board.png) and a [dark version](/images/lornode/dark.svg). ![x](/images/lornode/b.webp) ![y](/images/lornode/photo.jpg)'
		);
		expect(result.assets).toEqual([
			'a/b.webp',
			'hardware/board.png',
			'photo.jpg',
			'pinout/dark.svg'
		]);
	});

	it('de-duplicates assets', () => {
		const result = rewrite('![a](../pinout/x.png) ![b](../pinout/x.png)');
		expect(result.assets).toEqual(['pinout/x.png']);
	});

	it('links other ../ files to GitHub blob URLs', () => {
		expect(rewrite('[Schematic](../hardware/lornode-v2-schematic.pdf)').markdown).toBe(
			`[Schematic](${repoUrl}/blob/main/hardware/lornode-v2-schematic.pdf)`
		);
		expect(rewrite('[Licence](../LICENSE.md)').markdown).toBe(
			`[Licence](${repoUrl}/blob/main/LICENSE.md)`
		);
	});

	it('links other ../ folders to GitHub tree URLs', () => {
		expect(rewrite('[Sketch](../examples/01_BlinkAndBattery)').markdown).toBe(
			`[Sketch](${repoUrl}/tree/main/examples/01_BlinkAndBattery)`
		);
		expect(rewrite('[`hardware/`](../hardware)').markdown).toBe(
			`[\`hardware/\`](${repoUrl}/tree/main/hardware)`
		);
	});

	it('uses the given branch for GitHub links', () => {
		expect(rewrite('[Tools](../tools)', 'dev').markdown).toBe(`[Tools](${repoUrl}/tree/dev/tools)`);
	});

	it('leaves absolute, root-relative and anchor links unchanged', () => {
		const markdown = [
			'[a](https://example.com/foo.md)',
			'[b](http://example.com/x.png)',
			'[c](mailto:support@selfcrafted.in)',
			'[d](/crafts)',
			'[e](#cautions)',
			'![f](/images/lornode/x.svg)'
		].join('\n');
		const result = rewrite(markdown);
		expect(result.markdown).toBe(markdown);
		expect(result.assets).toEqual([]);
	});

	it('rewrites HTML src and href attributes', () => {
		const result = rewrite(
			'<img src="../pinout/board.svg" alt=""> <a href="library.md#pin-constants">pins</a> <a href=\'../tools\'>tools</a> <a href="https://x.dev">x</a>'
		);
		expect(result.markdown).toBe(
			`<img src="/images/lornode/board.svg" alt=""> <a href="/docs/lornode/library#pin-constants">pins</a> <a href='${repoUrl}/tree/main/tools'>tools</a> <a href="https://x.dev">x</a>`
		);
		expect(result.assets).toEqual(['pinout/board.svg']);
	});

	it('rewrites reference-style link definitions', () => {
		expect(rewrite('[pins][p]\n\n[p]: pinout.md').markdown).toBe(
			'[pins][p]\n\n[p]: /docs/lornode/pinout'
		);
	});

	it('handles several links on one line and titles', () => {
		expect(rewrite('[a](a.md "A") then [b](../b.txt)').markdown).toBe(
			`[a](/docs/lornode/a "A") then [b](${repoUrl}/blob/main/b.txt)`
		);
	});

	it('never rewrites inside fenced code blocks', () => {
		const markdown = [
			'Before [a](a.md)',
			'',
			'```md',
			'[a](a.md) ![p](../pinout/x.svg) <img src="../pinout/y.svg">',
			'```',
			'',
			'~~~',
			'[b](b.md)',
			'~~~',
			'',
			'After [b](b.md)'
		].join('\n');
		const result = rewrite(markdown);
		expect(result.markdown).toBe(
			markdown
				.replace('Before [a](a.md)', 'Before [a](/docs/lornode/a)')
				.replace('After [b](b.md)', 'After [b](/docs/lornode/b)')
		);
		expect(result.assets).toEqual([]);
	});

	it('does not end a backtick fence on a shorter or different fence', () => {
		const markdown = ['````', '```', '[a](a.md)', '~~~', '````', '[b](b.md)'].join('\n');
		expect(rewrite(markdown).markdown).toBe(markdown.replace('[b](b.md)', '[b](/docs/lornode/b)'));
	});

	it('never rewrites inside inline code', () => {
		const markdown = 'Use `[a](a.md)` or ``![p](../pinout/x.svg)``, but [b](b.md).';
		const result = rewrite(markdown);
		expect(result.markdown).toBe(
			'Use `[a](a.md)` or ``![p](../pinout/x.svg)``, but [b](/docs/lornode/b).'
		);
		expect(result.assets).toEqual([]);
	});

	it('treats an unmatched backtick as text', () => {
		expect(rewrite('A ` tick and [a](a.md)').markdown).toBe('A ` tick and [a](/docs/lornode/a)');
	});
});
