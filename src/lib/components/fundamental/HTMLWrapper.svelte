<script lang="ts">
	import { modifyHtml } from '$lib/client/helper';
	import DOMPurify from 'isomorphic-dompurify';

	interface Props {
		html: string;
	}

	let { html }: Props = $props();

	const modifiedHtml = $derived(modifyHtml(DOMPurify.sanitize(html, { ADD_TAGS: ['style'] })));
</script>

<div
	class="break-words [overflow-wrap:anywhere] [&_.html-table-scroll]:my-4 [&_.html-table-scroll]:overflow-x-auto [&_.html-table-scroll_table]:w-max [&_.html-table-scroll_table]:min-w-full [&_.html-table-scroll_table]:border-collapse [&_a]:break-all [&_a]:!text-info [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:decoration-2 dark:[&_a]:!text-accent-dark [&_th]:border [&_td]:border [&_th]:!border-border [&_td]:!border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_td]:px-3 [&_td]:py-2 [&_td]:text-left">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- DOMPurify-sanitized creator HTML, then CSS-scoped via modifyHtml() -->
	{@html modifiedHtml}
</div>
