<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SeoHead } from '$lib/components/seo';
	import { absoluteUrl, getSiteUrl } from '$lib/seo/site';

	let { data } = $props();

	const canonical = $derived(absoluteUrl('/docs', getSiteUrl(page.url.origin)));
</script>

<SeoHead
	meta={{
		title: 'Product docs',
		description:
			'Guides, pinouts and reference docs for Selfcrafted products, written by the makers who build them.',
		canonical,
		type: 'website'
	}} />

<div class="bg-background text-foreground">
	<header class="border-b border-border">
		<div class="mx-auto max-w-7xl px-4 py-10 md:py-14">
			<p class="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">Docs</p>
			<h1 class="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
				Product docs
			</h1>
			<p class="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
				Set-up guides, pinouts and reference for the hardware sold on Selfcrafted. Each product's
				docs live in its open source repo, so they stay in step with the design.
			</p>
		</div>
	</header>

	<section class="mx-auto max-w-7xl px-4 py-10 md:py-14" aria-labelledby="docs-products-heading">
		<h2 id="docs-products-heading" class="sr-only">Products</h2>
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.products as product (product.slug)}
				<li>
					<a
						href={resolve('/docs/[product]/[[page]]', { product: product.slug })}
						class="group flex h-full flex-col rounded-md border border-border bg-card p-6 transition-colors hover:border-foreground/40 hover:bg-muted/30">
						<span class="font-mono text-xs tracking-wide text-muted-foreground uppercase">
							{product.pageCount} pages
						</span>
						<span class="mt-3 text-xl font-semibold tracking-tight">{product.title}</span>
						<span class="mt-2 text-sm leading-relaxed text-muted-foreground">
							{product.tagline}
						</span>
						<span class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
							Read the docs
							<span aria-hidden="true" class="transition-transform group-hover:translate-x-1"
								>→</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
