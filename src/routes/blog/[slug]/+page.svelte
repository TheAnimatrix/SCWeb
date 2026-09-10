<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { formatPostDate } from '$lib/blog/types';
	import { JsonLd, SeoHead } from '$lib/components/seo';
	import { absoluteUrl, getSiteUrl } from '$lib/seo/site';

	let { data } = $props();

	const siteUrl = $derived(getSiteUrl(page.url.origin));
	const canonical = $derived(absoluteUrl(`/blog/${data.post.slug}`, siteUrl));
	const publishedTime = $derived(`${data.post.publishedAt}T00:00:00.000Z`);
	const coverUrl = $derived(
		data.post.cover ? absoluteUrl(data.post.cover.src, siteUrl) : undefined
	);
	const articleJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: data.post.title,
		description: data.post.excerpt,
		datePublished: publishedTime,
		dateModified: publishedTime,
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': canonical
		},
		author: {
			'@type': 'Organization',
			name: 'Selfcrafted',
			url: absoluteUrl('/', siteUrl)
		},
		publisher: {
			'@type': 'Organization',
			name: 'Selfcrafted',
			url: absoluteUrl('/', siteUrl)
		},
		articleSection: data.post.category,
		...(coverUrl ? { image: [coverUrl] } : {}),
		wordCount: data.post.body.reduce((count, block) => {
			const text = block.type === 'list' ? block.items.join(' ') : block.text;
			return count + text.trim().split(/\s+/).length;
		}, 0),
		url: canonical
	});
</script>

<SeoHead
	meta={{
		title: data.post.title,
		description: data.post.excerpt,
		canonical,
		type: 'article',
		publishedTime,
		author: 'Selfcrafted',
		...(data.post.cover
			? {
					image: data.post.cover.src,
					imageAlt: data.post.cover.alt,
					imageWidth: data.post.cover.width,
					imageHeight: data.post.cover.height
				}
			: {})
	}} />
<JsonLd data={articleJsonLd} />

<div class="bg-background text-foreground">
	<article>
		<header class="border-b border-border">
			<div class="mx-auto max-w-[760px] px-5 pt-10 pb-12 sm:px-8 sm:pt-16 sm:pb-16 lg:pt-20">
				<a
					href={resolve('/blog')}
					class="group inline-flex items-center gap-2 font-mono text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground">
					<span aria-hidden="true" class="transition-transform group-hover:-translate-x-1">←</span>
					Back to journal
				</a>

				<div class="mt-12 sm:mt-16">
					<p class="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
						{data.post.category}
					</p>
					<h1
						class="mt-5 max-w-[740px] text-[2.6rem] leading-[1.05] font-medium tracking-[-0.035em] text-balance sm:text-6xl sm:leading-[1.02] [font-family:Georgia,'Times_New_Roman',serif]">
						{data.post.title}
					</h1>
					<p
						class="mt-7 max-w-[650px] text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
						{data.post.excerpt}
					</p>
				</div>

				<div class="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
					<span class="font-medium">Selfcrafted</span>
					<span class="text-border" aria-hidden="true">/</span>
					<time class="text-muted-foreground" datetime={data.post.publishedAt}>
						{formatPostDate(data.post.publishedAt)}
					</time>
					<span class="text-border" aria-hidden="true">/</span>
					<span class="text-muted-foreground">{data.post.readingMinutes} min read</span>
				</div>
			</div>
		</header>

		{#if data.post.cover}
			<figure class="mx-auto max-w-[960px] px-5 pt-10 sm:px-8 sm:pt-14">
				<img
					src={data.post.cover.src}
					alt={data.post.cover.alt}
					width={data.post.cover.width}
					height={data.post.cover.height}
					class="aspect-[3/2] h-auto w-full border border-border bg-muted/30 object-cover" />
				{#if data.post.cover.caption}
					<figcaption class="mt-3 text-sm leading-6 text-muted-foreground">
						{data.post.cover.caption}
					</figcaption>
				{/if}
			</figure>
		{/if}

		<div
			class="mx-auto max-w-[720px] px-5 py-12 sm:px-8 sm:py-16 [font-family:Georgia,'Times_New_Roman',serif]">
			{#each data.post.body as block, index (`${block.type}-${index}`)}
				{#if block.type === 'paragraph'}
					<p class="mb-7 text-[1.12rem] leading-[1.82] text-foreground/90 sm:text-[1.2rem]">
						{block.text}
					</p>
					{#if block.links?.length}
						<div
							class="-mt-3 mb-8 flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm"
							aria-label="Sources">
							{#each block.links as link (link.href)}
								<!-- eslint-disable svelte/no-navigation-without-resolve -- paragraph links are public external sources -->
								<a
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									class="border-b border-border pb-0.5 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
									{link.label}<span class="sr-only"> (opens in a new tab)</span>
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/each}
						</div>
					{/if}
				{:else if block.type === 'heading'}
					<h2
						class="mt-14 mb-6 text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[1.9rem]">
						{block.text}
					</h2>
				{:else if block.type === 'quote'}
					<blockquote
						class="my-12 border-y border-border py-8 text-[1.55rem] leading-[1.45] tracking-[-0.015em] text-foreground sm:px-6 sm:text-[1.8rem]">
						“{block.text}”
					</blockquote>
				{:else if block.type === 'list'}
					<ul
						class="my-8 space-y-4 pl-6 text-[1.08rem] leading-[1.75] text-foreground/90 sm:text-[1.16rem]">
						{#each block.items as item (item)}
							<li class="list-disc pl-2 marker:text-muted-foreground">{item}</li>
						{/each}
					</ul>
				{/if}
			{/each}
		</div>
	</article>

	{#if data.related.length}
		<section class="border-t border-border" aria-labelledby="keep-reading-heading">
			<div class="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
				<div class="flex items-end justify-between gap-5 border-b border-border pb-5">
					<div>
						<p class="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
							Journal
						</p>
						<h2 id="keep-reading-heading" class="mt-2 text-2xl font-medium tracking-tight">
							Keep reading
						</h2>
					</div>
					<a
						href={resolve('/blog')}
						class="text-sm text-muted-foreground transition-colors hover:text-foreground">
						All stories →
					</a>
				</div>

				<div class="grid md:grid-cols-2">
					{#each data.related as related (related.slug)}
						<a
							href={resolve('/blog/[slug]', { slug: related.slug })}
							class="group grid border-b border-border py-8 md:border-b-0 md:px-8 md:first:border-r md:first:pl-0 md:last:pr-0 {related.cover
								? 'grid-cols-[minmax(0,1fr)_5rem] gap-5'
								: 'grid-cols-1'}">
							<div class="min-w-0">
								<p class="font-mono text-xs tracking-wide text-muted-foreground uppercase">
									{related.category} · {related.readingMinutes} min
								</p>
								<h3
									class="mt-4 text-2xl leading-tight font-medium tracking-[-0.02em] transition-opacity group-hover:opacity-65 [font-family:Georgia,'Times_New_Roman',serif]">
									{related.title}
								</h3>
								<p class="mt-4 text-base leading-7 text-muted-foreground">{related.excerpt}</p>
							</div>
							{#if related.cover}
								<img
									src={related.cover.src}
									alt=""
									width={related.cover.width}
									height={related.cover.height}
									loading="lazy"
									class="aspect-square h-auto w-full border border-border object-cover" />
							{/if}
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>
