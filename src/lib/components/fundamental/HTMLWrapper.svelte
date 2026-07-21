<script lang="ts">
	import { browser } from '$app/environment';
	import { modifyHtml } from '$lib/client/helper';

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

	function sanitize(DOMPurify: DomPurifyLike, source: string) {
		return modifyHtml(DOMPurify.sanitize(source, { ADD_TAGS: ['style'] }));
	}

	const contentClasses =
		'break-words [overflow-wrap:anywhere] [&_.html-table-scroll]:my-4 [&_.html-table-scroll]:overflow-x-auto [&_.html-table-scroll_table]:w-max [&_.html-table-scroll_table]:min-w-full [&_.html-table-scroll_table]:border-collapse [&_a]:break-all [&_a]:!text-info [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:decoration-2 dark:[&_a]:!text-accent-dark [&_th]:border [&_td]:border [&_th]:!border-border [&_td]:!border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_td]:px-3 [&_td]:py-2 [&_td]:text-left';
</script>

{#snippet skeleton()}
	<div class="space-y-2" aria-busy="true" aria-label="Loading content">
		<div class="h-3 w-full animate-pulse rounded bg-muted"></div>
		<div class="h-3 w-5/6 animate-pulse rounded bg-muted"></div>
		<div class="h-3 w-4/6 animate-pulse rounded bg-muted"></div>
	</div>
{/snippet}

{#if html}
	{#if !browser || !dompurifyPromise}
		{@render skeleton()}
	{:else}
		{#await dompurifyPromise}
			{@render skeleton()}
		{:then DOMPurify}
			<div class={contentClasses}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- DOMPurify-sanitized creator HTML, then CSS-scoped via modifyHtml() -->
				{@html sanitize(DOMPurify, html)}
			</div>
		{:catch}
			<p class="text-sm text-muted-foreground">Unable to render content.</p>
		{/await}
	{/if}
{/if}
