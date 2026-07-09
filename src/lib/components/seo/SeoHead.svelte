<script lang="ts">
	import { page } from '$app/state';
	import { type SeoMeta, resolveSeo } from '$lib/seo/meta';
	import { getSiteUrl } from '$lib/seo/site';

	let { meta = {} }: { meta?: SeoMeta } = $props();

	const resolved = $derived(
		resolveSeo(meta, getSiteUrl(page.url.origin))
	);
</script>

<svelte:head>
	<title>{resolved.title}</title>
	<meta name="description" content={resolved.description} />
	{#if resolved.keywords?.length}
		<meta name="keywords" content={resolved.keywords.join(', ')} />
	{/if}
	<link rel="canonical" href={resolved.canonical} />

	{#if resolved.noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta name="robots" content="index, follow" />
	{/if}

	<meta property="og:title" content={resolved.title} />
	<meta property="og:description" content={resolved.description} />
	<meta property="og:type" content={resolved.type === 'product' ? 'product' : 'website'} />
	<meta property="og:url" content={resolved.canonical} />
	<meta property="og:image" content={resolved.image} />
	<meta property="og:image:alt" content={resolved.imageAlt} />
	<meta property="og:site_name" content="Selfcrafted India" />
	<meta property="og:locale" content="en_IN" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={resolved.title} />
	<meta name="twitter:description" content={resolved.description} />
	<meta name="twitter:image" content={resolved.image} />
	<meta name="twitter:image:alt" content={resolved.imageAlt} />
</svelte:head>
