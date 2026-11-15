<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SeoHead } from '$lib/components/seo';
	import { absoluteUrl, getSiteUrl } from '$lib/seo/site';

	let { data } = $props();
</script>

<SeoHead
	meta={{
		title: 'Blog',
		description:
			"What we're building at Selfcrafted, and practical guides for people making and selling hardware in India.",
		canonical: absoluteUrl('/blog', getSiteUrl(page.url.origin)),
		type: 'website'
	}} />

<div class="bg-background text-foreground">
	<header class="border-b border-border">
		<div class="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
			<h1 class="font-serif text-4xl font-normal tracking-tight sm:text-5xl">Blog</h1>
			<p class="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
				What we're building at Selfcrafted, and what we've learned making and selling hardware in
				India.
			</p>
		</div>
	</header>

	<section class="mx-auto max-w-5xl px-5 sm:px-8" aria-label="Posts">
		{#each data.posts as post (post.slug)}
			<article class="border-b border-border py-9 last:border-b-0 sm:py-11">
				<a
					class="group grid gap-6 {post.cover
						? 'sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-10'
						: 'grid-cols-1'}"
					href={resolve('/blog/[slug]', { slug: post.slug })}>
					<div class="min-w-0">
						<p
							class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
							<span class="font-medium text-foreground">{post.category}</span>
							<time datetime={post.publishedAt}>{post.publishedLabel}</time>
							<span>{post.readingMinutes} min read</span>
						</p>
						<h2
							class="font-serif text-2xl font-normal leading-tight tracking-tight decoration-1 underline-offset-4 group-hover:underline sm:text-3xl">
							{post.title}
						</h2>
						<p class="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
							{post.excerpt}
						</p>
					</div>
					{#if post.cover}
						<img
							src={post.cover.src}
							alt=""
							width={post.cover.width}
							height={post.cover.height}
							loading="lazy"
							class="hidden aspect-[3/2] h-auto w-full self-center object-contain sm:block {post
								.cover.lineArt
								? 'blog-line-art'
								: 'border border-border'}" />
					{/if}
				</a>
			</article>
		{:else}
			<p class="py-16 text-base text-muted-foreground">Nothing here yet.</p>
		{/each}
	</section>
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
