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
	const modifiedTime = $derived(`${data.post.updatedAt ?? data.post.publishedAt}T00:00:00.000Z`);
	const coverUrl = $derived(
		data.post.cover ? absoluteUrl(data.post.cover.ogSrc ?? data.post.cover.src, siteUrl) : undefined
	);
	const articleJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: data.post.title,
		description: data.post.excerpt,
		datePublished: publishedTime,
		dateModified: modifiedTime,
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
					image: data.post.cover.ogSrc ?? data.post.cover.src,
					imageAlt: data.post.cover.alt,
					imageWidth: data.post.cover.ogSrc ? 1200 : data.post.cover.width,
					imageHeight: data.post.cover.ogSrc ? 630 : data.post.cover.height
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
					class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
					<span aria-hidden="true">←</span>
					All posts
				</a>

				<div class="mt-12 sm:mt-16">
					<p class="text-sm text-muted-foreground">
						{data.post.category}
					</p>
					<h1
						class="mt-4 max-w-[740px] font-serif text-[2.4rem] leading-[1.08] font-medium tracking-tight text-balance sm:text-5xl sm:leading-[1.06]">
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
					{#if data.post.updatedAt && data.post.updatedAt !== data.post.publishedAt}
						<span class="text-border" aria-hidden="true">/</span>
						<span class="text-muted-foreground">
							Updated
							<time datetime={data.post.updatedAt}>{formatPostDate(data.post.updatedAt)}</time>
						</span>
					{/if}
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
					class="aspect-[3/2] h-auto w-full {data.post.cover.lineArt
						? 'blog-line-art object-contain'
						: 'border border-border bg-muted/30 object-cover'}" />
				{#if data.post.cover.caption || data.post.cover.credit}
					<figcaption class="mt-3 text-sm leading-6 text-muted-foreground">
						{[data.post.cover.caption, data.post.cover.credit].filter(Boolean).join(' ')}
					</figcaption>
				{/if}
			</figure>
		{/if}

		<div class="mx-auto max-w-[720px] px-5 py-12 font-serif sm:px-8 sm:py-16">
			{#each data.post.body as block, index (`${block.type}-${index}`)}
				{#if block.type === 'paragraph'}
					<p class="mb-7 text-[1.12rem] leading-[1.82] text-foreground/90 sm:text-[1.2rem]">
						{block.text}
					</p>
					{#if block.links?.length}
						<ul class="-mt-3 mb-8 flex flex-wrap gap-x-4 gap-y-2 font-figtree text-sm">
							{#each block.links as link (link.href)}
								{@const external = !link.href.startsWith('/')}
								<li>
									<!-- eslint-disable svelte/no-navigation-without-resolve -- hrefs come from our own posts file -->
									<a
										href={link.href}
										target={external ? '_blank' : undefined}
										rel={external ? 'noopener noreferrer' : undefined}
										class="border-b border-border pb-0.5 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
										{link.label}{#if external}<span class="sr-only">
												(opens in a new tab)</span
											>{/if}
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								</li>
							{/each}
						</ul>
					{/if}
				{:else if block.type === 'heading'}
					<h2
						class="mt-14 mb-6 text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[1.9rem]">
						{block.text}
					</h2>
				{:else if block.type === 'quote'}
					<blockquote
						class="my-12 border-y border-border py-8 text-[1.55rem] leading-[1.45] tracking-[-0.015em] text-foreground sm:px-6 sm:text-[1.8rem]">
						<p>“{block.text}”</p>
						{#if block.attribution}
							<footer class="mt-4 font-figtree text-sm text-muted-foreground">
								{block.attribution}
							</footer>
						{/if}
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
					<h2 id="keep-reading-heading" class="text-2xl font-medium tracking-tight">
						Keep reading
					</h2>
					<a
						href={resolve('/blog')}
						class="text-sm text-muted-foreground transition-colors hover:text-foreground">
						All posts →
					</a>
				</div>

				<div class="grid md:grid-cols-2">
					{#each data.related as related (related.slug)}
						<a
							href={resolve('/blog/[slug]', { slug: related.slug })}
							class="group grid grid-cols-1 border-b border-border py-8 md:border-b-0 md:px-8 md:first:border-r md:first:pl-0 md:last:pr-0">
							<div class="min-w-0">
								<p class="text-sm text-muted-foreground">
									{related.category} · {related.readingMinutes} min read
								</p>
								<h3
									class="mt-3 font-serif text-2xl leading-tight font-medium tracking-tight decoration-1 underline-offset-4 group-hover:underline">
									{related.title}
								</h3>
								<p class="mt-4 text-base leading-7 text-muted-foreground">{related.excerpt}</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	/* Line art is drawn in black. The site defaults to dark, so flip it unless the light theme is on. */
	.blog-line-art {
		filter: invert(1);
	}

	:global(.light) .blog-line-art {
		filter: none;
	}
</style>
