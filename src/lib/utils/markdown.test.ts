import { describe, expect, it } from 'vitest';
import { contentToPlainText, looksLikeHtml, renderUserContent } from './markdown';

describe('renderUserContent', () => {
	it('keeps single line breaks and paragraphs in plain text', () => {
		expect(renderUserContent('Line one\nLine two\n\nSecond paragraph')).toBe(
			'<p>Line one<br>Line two</p><p>Second paragraph</p>'
		);
	});

	it('renders markdown lists, headings and links', () => {
		const html = renderUserContent('## Specs\n\n- 24V\n- 40W\n\nSee [docs](https://example.com)');
		expect(html).toContain('<h2>Specs</h2>');
		expect(html).toContain('<ul><li>24V</li><li>40W</li></ul>');
		expect(html).toContain('<a href="https://example.com">docs</a>');
	});

	it('passes existing HTML through unchanged', () => {
		expect(renderUserContent('<p>Hello <b>there</b></p>')).toBe('<p>Hello <b>there</b></p>');
		expect(looksLikeHtml('a < b and c > d')).toBe(false);
	});

	it('returns an empty string for blank input', () => {
		expect(renderUserContent('  \n ')).toBe('');
	});
});

describe('contentToPlainText', () => {
	it('strips tags, keeps line breaks and decodes entities', () => {
		expect(contentToPlainText('<p>One &amp; two</p><p>Three<br>Four</p><script>x()</script>')).toBe(
			'One & two\nThree\nFour'
		);
	});
});
