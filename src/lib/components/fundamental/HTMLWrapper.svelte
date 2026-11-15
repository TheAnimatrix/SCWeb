<script lang="ts">
	import { browser } from '$app/environment';
	import { modifyHtml } from '$lib/client/helper';
	import ProductImageZoomModal from '$lib/components/product/ProductImageZoomModal.svelte';

	interface Props {
		html: string;
	}

	let { html }: Props = $props();

	type DomPurifyLike = {
		sanitize: (source: string, config?: { ADD_TAGS?: string[] }) => string;
	};

	// Use browser-only `dompurify` — isomorphic-dompurify pulls jsdom and can hang
	// or fail when dynamically imported in the client.
	const dompurifyPromise: Promise<DomPurifyLike> | null = browser
		? import('dompurify').then(({ default: DOMPurify }) => DOMPurify as DomPurifyLike)
		: null;

	const SANITIZE_CONFIG = { ADD_TAGS: ['style'] };

	function sanitize(DOMPurify: DomPurifyLike, source: string) {
		// modifyHtml() rewrites tags with regexes, and a regex can be fooled by a ">" inside a
		// quoted attribute into turning inert attribute text into live markup. So the string that
		// reaches {@html} is sanitised again after the rewrite, never only before it.
		const rewritten = modifyHtml(DOMPurify.sanitize(source, SANITIZE_CONFIG));
		return DOMPurify.sanitize(rewritten, SANITIZE_CONFIG);
	}

	/** Plain-text version of maker content, for server rendering before DOMPurify loads. */
	function contentToPlainText(content: string): string {
		return content
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(?:p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
			.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&amp;/g, '&')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
	}

	// Server render and the first client frame show the text without markup (escaped by
	// Svelte, so nothing executes). Search engines get the words, and nothing pops in
	// from a skeleton. The sanitised HTML replaces it once DOMPurify has loaded.
	const plainText = $derived(contentToPlainText(html));

	// Click-to-zoom for images inside the content. Attached by event delegation on the
	// container, so the sanitised HTML is never rewritten to add wrappers or handlers.
	let zoomOpen = $state(false);
	let zoomSrc = $state<string | null>(null);
	let zoomAlt = $state('');

	function zoomTarget(event: Event): HTMLImageElement | null {
		const target = event.target;
		if (!(target instanceof HTMLImageElement) || !target.currentSrc) return null;
		// Images inside links keep the link's behaviour.
		if (target.closest('a')) return null;
		return target;
	}

	function openZoom(image: HTMLImageElement) {
		zoomSrc = image.currentSrc || image.src;
		zoomAlt = image.alt || 'Image';
		zoomOpen = true;
	}

	function handleClick(event: MouseEvent) {
		const image = zoomTarget(event);
		if (!image) return;
		event.preventDefault();
		openZoom(image);
	}
</script>

{#snippet plain()}
	<div class="user-content whitespace-pre-line">{plainText}</div>
{/snippet}

{#if html}
	{#if !browser || !dompurifyPromise}
		{@render plain()}
	{:else}
		{#await dompurifyPromise}
			{@render plain()}
		{:then DOMPurify}
			<!-- Click-to-zoom is a mouse/touch shortcut; the image itself stays plain content. -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div class="user-content" onclick={handleClick}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- DOMPurify-sanitized creator HTML, then CSS-scoped via modifyHtml() -->
				{@html sanitize(DOMPurify, html)}
			</div>
		{:catch}
			{@render plain()}
		{/await}
	{/if}
{/if}

{#if zoomSrc}
	<ProductImageZoomModal bind:open={zoomOpen} src={zoomSrc} alt={zoomAlt} />
{/if}

<style>
	/*
	 * Typography for maker-written content (descriptions, docs, FAQ answers, shipping notes).
	 * Selectors are class + element, so a maker's own <style> block (scoped by modifyHtml to
	 * `element#scdesc`, i.e. id specificity) still wins wherever it sets something.
	 */
	.user-content {
		overflow-wrap: anywhere;
		word-break: break-word;
		line-height: 1.7;
	}

	.user-content :global(> :first-child) {
		margin-top: 0;
	}
	.user-content :global(> :last-child) {
		margin-bottom: 0;
	}

	.user-content :global(p) {
		margin: 0 0 0.85em;
	}

	.user-content :global(h1),
	.user-content :global(h2),
	.user-content :global(h3),
	.user-content :global(h4) {
		margin: 1.6em 0 0.55em;
		font-weight: 650;
		line-height: 1.3;
		letter-spacing: -0.01em;
		color: hsl(var(--foreground));
	}
	.user-content :global(h1) {
		font-size: 1.5rem;
	}
	.user-content :global(h2) {
		font-size: 1.25rem;
	}
	.user-content :global(h3) {
		font-size: 1.075rem;
	}
	.user-content :global(h4) {
		font-size: 1rem;
	}

	.user-content :global(ul),
	.user-content :global(ol) {
		margin: 0 0 1em;
		padding-left: 1.35em;
	}
	.user-content :global(ul) {
		list-style: disc;
	}
	.user-content :global(ol) {
		list-style: decimal;
	}
	.user-content :global(li) {
		margin: 0.35em 0;
		padding-left: 0.2em;
	}
	.user-content :global(li::marker) {
		color: hsl(var(--muted-foreground));
	}
	.user-content :global(li > ul),
	.user-content :global(li > ol) {
		margin: 0.35em 0 0;
	}

	.user-content :global(strong),
	.user-content :global(b) {
		font-weight: 650;
		color: hsl(var(--foreground));
	}

	.user-content :global(a) {
		color: hsl(var(--info, 199 89% 48%));
		text-decoration: underline;
		text-underline-offset: 2px;
		word-break: break-word;
	}
	.user-content :global(a:hover) {
		text-decoration-thickness: 2px;
	}

	.user-content :global(blockquote) {
		margin: 0 0 1em;
		padding: 0.25em 0 0.25em 1em;
		border-left: 3px solid hsl(var(--border));
		color: hsl(var(--muted-foreground));
	}

	.user-content :global(code) {
		font-size: 0.875em;
		padding: 0.1em 0.35em;
		border-radius: 0.3em;
		background: hsl(var(--muted));
	}
	.user-content :global(pre) {
		margin: 0 0 1em;
		padding: 0.85em 1em;
		overflow-x: auto;
		border-radius: 0.5rem;
		background: hsl(var(--muted));
		line-height: 1.5;
	}
	.user-content :global(pre code) {
		padding: 0;
		background: none;
	}

	.user-content :global(hr) {
		margin: 1.5em 0;
		border: 0;
		border-top: 1px solid hsl(var(--border));
	}

	.user-content :global(img) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 1em 0;
		border-radius: 0.5rem;
		cursor: zoom-in;
	}
	.user-content :global(a img) {
		cursor: pointer;
	}

	/* Tables: modifyHtml wraps each one in .html-table-scroll. */
	.user-content :global(.html-table-scroll) {
		margin: 1em 0;
		overflow-x: auto;
	}
	.user-content :global(table) {
		min-width: 100%;
		border-collapse: collapse;
		font-size: 0.95em;
	}
	.user-content :global(th),
	.user-content :global(td) {
		padding: 0.5em 0.75em;
		border: 1px solid hsl(var(--border));
		text-align: left;
		vertical-align: top;
	}
	.user-content :global(th) {
		font-weight: 600;
		background: hsl(var(--muted) / 0.5);
	}

	/*
	 * Many makers wrote their <style> for the dark theme (for example white table borders).
	 * In the light theme those borders vanish, so the theme border colour wins there.
	 * `#scdesc` matches modifyHtml's id, which lifts this above the maker's scoped rule.
	 */
	:global(html.light) .user-content :global(:is(table, th, td)#scdesc) {
		border-color: hsl(var(--border));
	}
</style>
