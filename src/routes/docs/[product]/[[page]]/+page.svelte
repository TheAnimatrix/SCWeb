<script lang="ts">
	import { page as appPage } from '$app/state';
	import { resolve } from '$app/paths';
	import { JsonLd, SeoHead } from '$lib/components/seo';
	import { ScButton } from '$lib/components/sc';
	import { absoluteUrl, getSiteUrl } from '$lib/seo/site';

	let { data } = $props();

	const product = $derived(data.product);
	const doc = $derived(data.page);
	const siteUrl = $derived(getSiteUrl(appPage.url.origin));
	const docParams = (slug: string) => ({ product: product.slug, page: slug || undefined });
	const docPath = (slug: string) => resolve('/docs/[product]/[[page]]', docParams(slug));
	const canonical = $derived(absoluteUrl(docPath(doc.slug), siteUrl));
	const editUrl = $derived(`${product.repoUrl}/blob/main/docs/${doc.slug || 'index'}.md`);
	const title = $derived(`${doc.title} · ${product.title} docs`);
	const description = $derived(doc.description || `${product.title} documentation.`);
	const syncedDate = $derived(
		data.meta?.syncedAt
			? new Date(data.meta.syncedAt).toLocaleDateString('en-IN', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					timeZone: 'UTC'
				})
			: null
	);

	const techArticleJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: title,
		description,
		url: canonical,
		mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
		...(data.meta?.syncedAt ? { dateModified: data.meta.syncedAt } : {}),
		about: {
			'@type': 'Product',
			name: product.title,
			url: absoluteUrl(product.productPath, siteUrl)
		},
		isPartOf: {
			'@type': 'CreativeWork',
			name: `${product.title} docs`,
			url: absoluteUrl(docPath(''), siteUrl)
		},
		publisher: {
			'@type': 'Organization',
			name: 'Selfcrafted',
			url: absoluteUrl('/', siteUrl)
		}
	});
</script>

<SeoHead meta={{ title, description, canonical, type: 'article' }} />
<JsonLd data={techArticleJsonLd} />

{#snippet pageNav(label: string)}
	<nav aria-label={label}>
		<ul class="space-y-0.5">
			{#each data.pages as item (item.slug)}
				{@const current = item.slug === doc.slug}
				<li>
					<a
						href={resolve('/docs/[product]/[[page]]', docParams(item.slug))}
						aria-current={current ? 'page' : undefined}
						class="block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors {current
							? 'border-foreground bg-muted/40 font-medium text-foreground'
							: 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'}">
						{item.title}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/snippet}

{#snippet productCard()}
	<div class="rounded-md border border-border bg-card p-5">
		<p class="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">Product</p>
		<p class="mt-2 text-lg font-semibold tracking-tight">{product.title}</p>
		<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{product.tagline}</p>
		<div class="mt-4 flex flex-col gap-2">
			<ScButton href={product.productPath} class="w-full">Buy {product.title}</ScButton>
			<ScButton
				href={product.repoUrl}
				target="_blank"
				rel="noopener noreferrer"
				variant="secondary"
				class="w-full">
				View on GitHub<span class="sr-only"> (opens in a new tab)</span>
			</ScButton>
		</div>
	</div>
{/snippet}

<div class="bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<p class="font-mono text-xs tracking-wide text-muted-foreground">
			<a href={resolve('/docs')} class="transition-colors hover:text-foreground">docs</a>
			<span aria-hidden="true" class="px-1.5 text-border">/</span>
			<a
				href={resolve('/docs/[product]/[[page]]', docParams(''))}
				class="transition-colors hover:text-foreground">{product.slug}</a>
			{#if doc.slug}
				<span aria-hidden="true" class="px-1.5 text-border">/</span>
				<span class="text-foreground">{doc.slug}</span>
			{/if}
		</p>

		<details class="group mt-6 rounded-md border border-border bg-card lg:hidden">
			<summary
				class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
				<span>
					<span class="text-muted-foreground">{product.title} docs:</span>
					{doc.title}
				</span>
				<span
					aria-hidden="true"
					class="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
			</summary>
			<div class="border-t border-border p-2">
				{@render pageNav(`${product.title} docs pages`)}
			</div>
		</details>

		<div
			class="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_13rem] xl:gap-12">
			<aside class="hidden lg:block">
				<div
					class="sticky top-[calc(var(--site-topbar-height)+2rem)] max-h-[calc(100vh-var(--site-topbar-height)-4rem)] space-y-8 overflow-y-auto pb-4">
					<div>
						<p
							class="mb-3 px-3 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
							{product.title}
						</p>
						{@render pageNav(`${product.title} docs`)}
					</div>
					{@render productCard()}
				</div>
			</aside>

			<div class="min-w-0">
				<article class="docs-prose">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- first-party docs committed to this repo, rendered server-side -->
					{@html doc.html}
				</article>

				<div class="mt-12 space-y-8 border-t border-border pt-8">
					{#if doc.prev || doc.next}
						<nav aria-label="Previous and next page" class="grid gap-3 sm:grid-cols-2">
							{#if doc.prev}
								<a
									href={resolve('/docs/[product]/[[page]]', docParams(doc.prev.slug))}
									rel="prev"
									class="group rounded-md border border-border p-4 transition-colors hover:border-foreground/40 hover:bg-muted/30">
									<span class="block font-mono text-xs text-muted-foreground">← Previous</span>
									<span class="mt-1 block font-medium">{doc.prev.title}</span>
								</a>
							{:else}
								<span class="hidden sm:block"></span>
							{/if}
							{#if doc.next}
								<a
									href={resolve('/docs/[product]/[[page]]', docParams(doc.next.slug))}
									rel="next"
									class="group rounded-md border border-border p-4 text-right transition-colors hover:border-foreground/40 hover:bg-muted/30">
									<span class="block font-mono text-xs text-muted-foreground">Next →</span>
									<span class="mt-1 block font-medium">{doc.next.title}</span>
								</a>
							{/if}
						</nav>
					{/if}

					<div
						class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
						<!-- eslint-disable svelte/no-navigation-without-resolve -- external GitHub link -->
						<a
							href={editUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="border-b border-border pb-0.5 transition-colors hover:border-foreground hover:text-foreground">
							Edit this page on GitHub<span class="sr-only"> (opens in a new tab)</span>
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{#if syncedDate}
							<span class="font-mono text-xs">Synced {syncedDate}</span>
						{/if}
					</div>

					<div class="lg:hidden">
						{@render productCard()}
					</div>
				</div>
			</div>

			{#if doc.headings.length}
				<aside class="hidden xl:block">
					<nav
						aria-label="On this page"
						class="sticky top-[calc(var(--site-topbar-height)+2rem)] max-h-[calc(100vh-var(--site-topbar-height)-4rem)] overflow-y-auto pb-4">
						<p class="mb-3 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
							On this page
						</p>
						<ul class="space-y-1.5 border-l border-border text-sm">
							{#each doc.headings as heading (heading.id)}
								<li>
									<a
										href={`#${heading.id}`}
										class="-ml-px block border-l border-transparent py-0.5 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground {heading.depth ===
										3
											? 'pl-6'
											: 'pl-3'}">
										{heading.text}
									</a>
								</li>
							{/each}
						</ul>
					</nav>
				</aside>
			{/if}
		</div>
	</div>
</div>

<style>
	.docs-prose {
		max-width: 72ch;
		font-size: 1rem;
		line-height: 1.75;
		color: hsl(var(--foreground) / 0.9);
	}

	.docs-prose > :global(:first-child) {
		margin-top: 0;
	}

	.docs-prose :global(h1) {
		margin-bottom: 1.5rem;
		font-size: clamp(2rem, 1.6rem + 1.6vw, 2.75rem);
		font-weight: 600;
		line-height: 1.1;
		letter-spacing: -0.03em;
		color: hsl(var(--foreground));
		text-wrap: balance;
	}

	.docs-prose :global(h2),
	.docs-prose :global(h3),
	.docs-prose :global(h4) {
		position: relative;
		scroll-margin-top: calc(var(--site-topbar-height) + 1.5rem);
		color: hsl(var(--foreground));
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.docs-prose :global(h2) {
		margin-top: 3rem;
		margin-bottom: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid hsl(var(--border));
		font-size: 1.5rem;
		line-height: 1.25;
	}

	.docs-prose :global(h3) {
		margin-top: 2.25rem;
		margin-bottom: 0.75rem;
		font-size: 1.2rem;
		line-height: 1.35;
	}

	.docs-prose :global(h4) {
		margin-top: 1.75rem;
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	.docs-prose :global(.heading-anchor) {
		margin-left: 0.5rem;
		color: hsl(var(--muted-foreground));
		font-weight: 400;
		text-decoration: none;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.docs-prose :global(h2:hover .heading-anchor),
	.docs-prose :global(h3:hover .heading-anchor),
	.docs-prose :global(.heading-anchor:focus-visible) {
		opacity: 1;
	}

	.docs-prose :global(p),
	.docs-prose :global(ul),
	.docs-prose :global(ol),
	.docs-prose :global(blockquote),
	.docs-prose :global(pre),
	.docs-prose :global(.docs-table) {
		margin-top: 0;
		margin-bottom: 1.25rem;
	}

	.docs-prose :global(ul) {
		padding-left: 1.5rem;
		list-style: disc;
	}

	.docs-prose :global(ol) {
		padding-left: 1.5rem;
		list-style: decimal;
	}

	.docs-prose :global(li) {
		margin-top: 0.375rem;
		padding-left: 0.25rem;
	}

	.docs-prose :global(li::marker) {
		color: hsl(var(--muted-foreground));
	}

	.docs-prose :global(li > ul),
	.docs-prose :global(li > ol) {
		margin-bottom: 0;
	}

	.docs-prose :global(a) {
		color: hsl(var(--foreground));
		text-decoration: underline;
		text-decoration-color: hsl(var(--muted-foreground) / 0.6);
		text-underline-offset: 0.2em;
		transition: text-decoration-color 150ms ease;
	}

	.docs-prose :global(a:hover) {
		text-decoration-color: hsl(var(--foreground));
	}

	.docs-prose :global(strong) {
		color: hsl(var(--foreground));
		font-weight: 600;
	}

	.docs-prose :global(blockquote) {
		padding: 0.25rem 0 0.25rem 1rem;
		border-left: 2px solid hsl(var(--border));
		color: hsl(var(--muted-foreground));
	}

	.docs-prose :global(hr) {
		margin: 2.5rem 0;
		border-color: hsl(var(--border));
	}

	.docs-prose :global(img) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 1.5rem 0;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.docs-prose :global(:not(pre) > code) {
		padding: 0.1em 0.35em;
		border: 1px solid hsl(var(--border));
		border-radius: 0.25rem;
		background: hsl(var(--muted) / 0.6);
		font-size: 0.875em;
		overflow-wrap: anywhere;
	}

	.docs-prose :global(pre) {
		overflow-x: auto;
		padding: 1rem 1.125rem;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		background-color: #0d1117;
		color: #e6edf3;
		font-size: 0.85rem;
		line-height: 1.65;
	}

	.docs-prose :global(pre code) {
		font-size: inherit;
	}

	.docs-prose :global(.docs-table) {
		overflow-x: auto;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.docs-prose :global(.docs-table table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.docs-prose :global(.docs-table th),
	.docs-prose :global(.docs-table td) {
		padding: 0.5rem 0.75rem;
		border: 1px solid hsl(var(--border));
		text-align: left;
		vertical-align: top;
	}

	.docs-prose :global(.docs-table tr > :first-child) {
		border-left: 0;
	}

	.docs-prose :global(.docs-table tr > :last-child) {
		border-right: 0;
	}

	.docs-prose :global(.docs-table thead tr > *) {
		border-top: 0;
	}

	.docs-prose :global(.docs-table tbody tr:last-child > *) {
		border-bottom: 0;
	}

	.docs-prose :global(.docs-table th) {
		background: hsl(var(--muted) / 0.5);
		color: hsl(var(--foreground));
		font-weight: 600;
		white-space: nowrap;
	}

	.docs-prose :global(.docs-table code) {
		white-space: nowrap;
		overflow-wrap: normal;
	}
</style>
