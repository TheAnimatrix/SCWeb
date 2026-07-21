<script lang="ts">
	let { data }: { data: Record<string, unknown> | Record<string, unknown>[] } = $props();

	const json = $derived(JSON.stringify(data).replace(/</g, '\\u003c'));
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD requires a script tag -->
	{@html `<script type="application/ld+json">${json}</script>`}
</svelte:head>
