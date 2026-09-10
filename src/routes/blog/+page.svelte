<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SeoHead } from '$lib/components/seo';
	import { absoluteUrl, getSiteUrl } from '$lib/seo/site';

	type Topic = 'All stories' | 'Perspectives' | 'Field notes' | 'Guides';

	let { data } = $props();

	const topics: Topic[] = ['All stories', 'Perspectives', 'Field notes', 'Guides'];
	let activeTopic = $state<Topic>('All stories');

	const featured = $derived(data.posts[0]);
	const visiblePosts = $derived(
		activeTopic === 'All stories'
			? data.posts.slice(1)
			: data.posts.filter((post) => post.category === activeTopic)
	);
</script>

<SeoHead
	meta={{
		title: 'Selfcrafted Journal',
		description:
			'Notes, field reports, and practical guides from the work of building independent hardware in India.',
		canonical: absoluteUrl('/blog', getSiteUrl(page.url.origin)),
		type: 'website',
		keywords: ['indie hardware', 'hardware makers India', 'maker guides', 'Selfcrafted Journal']
	}} />

<div class="bg-background text-foreground">
	<header class="border-b border-border">
		<div class="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
			<div class="flex items-end justify-between gap-8">
				<div>
					<p class="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
						Notes from the workshop
					</p>
					<h1
						class="font-serif text-[clamp(2.35rem,6vw,4.75rem)] font-normal leading-none tracking-[-0.045em]">
						Selfcrafted Journal
					</h1>
				</div>
				<p class="hidden max-w-64 text-right text-sm leading-6 text-muted-foreground md:block">
					Ideas and useful details for people turning small hardware projects into lasting products.
				</p>
			</div>
		</div>
	</header>

	{#if featured}
		<div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
			<section class="border-b border-border py-10 sm:py-12" aria-labelledby="featured-title">
				<div class="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
					<article class="max-w-4xl">
						<p class="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							Featured · {featured.category}
						</p>
						<a class="group block" href={resolve('/blog/[slug]', { slug: featured.slug })}>
							<h2
								id="featured-title"
								class="font-serif text-[clamp(2.25rem,4.5vw,3.6rem)] font-normal leading-[1.08] tracking-[-0.04em] decoration-1 underline-offset-8 group-hover:underline">
								{featured.title}
							</h2>
							<p
								class="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
								{featured.excerpt}
							</p>
						</a>
						<p class="mt-7 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
							<span class="font-medium text-foreground">Selfcrafted</span>
							<span aria-hidden="true">·</span>
							<time datetime={featured.publishedAt}>{featured.publishedLabel}</time>
							<span aria-hidden="true">·</span>
							<span>{featured.readingMinutes} min read</span>
						</p>
					</article>

					{#if featured.cover}
						<a
							href={resolve('/blog/[slug]', { slug: featured.slug })}
							aria-label={featured.title}
							class="block self-start overflow-hidden border border-border bg-muted/30">
							<img
								src={featured.cover.src}
								alt=""
								width={featured.cover.width}
								height={featured.cover.height}
								class="aspect-[4/3] h-auto w-full object-cover" />
						</a>
					{:else}
						<aside class="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
							<p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
								The journal
							</p>
							<p class="mt-4 text-sm leading-6 text-muted-foreground">
								Observations from prototyping, sourcing, documenting, and shipping independent
								hardware.
							</p>
							<a
								href={resolve('/crafting')}
								class="mt-6 inline-block border-b border-foreground pb-1 text-sm font-medium hover:border-muted-foreground hover:text-muted-foreground">
								Start crafting
							</a>
						</aside>
					{/if}
				</div>
			</section>

			<section class="py-12 sm:py-16" aria-labelledby="latest-heading">
				<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
					<div class="order-last lg:order-first">
						<div
							class="flex flex-col gap-6 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Archive
								</p>
								<h2 id="latest-heading" class="mt-2 font-serif text-3xl font-normal tracking-tight">
									Latest stories
								</h2>
							</div>
							<p class="text-xs text-muted-foreground">
								{visiblePosts.length}
								{visiblePosts.length === 1 ? 'story' : 'stories'}
							</p>
						</div>

						<div aria-live="polite">
							{#each visiblePosts as post (post.slug)}
								<article class="border-b border-border py-9 sm:py-11">
									<a
										class="group grid {post.cover
											? 'grid-cols-[minmax(0,1fr)_5rem] gap-5 sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-8'
											: 'grid-cols-1'}"
										href={resolve('/blog/[slug]', { slug: post.slug })}>
										<div class="min-w-0">
											<div
												class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
												<span class="font-medium text-foreground">{post.category}</span>
												<time datetime={post.publishedAt}>{post.publishedLabel}</time>
											</div>
											<h3
												class="font-serif text-2xl font-normal leading-tight tracking-[-0.02em] decoration-1 underline-offset-4 group-hover:underline sm:text-3xl">
												{post.title}
											</h3>
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
												class="aspect-square h-auto w-full border border-border object-cover sm:aspect-[4/3]" />
										{/if}
									</a>
									<p class="mt-5 text-sm text-muted-foreground">
										By Selfcrafted · {post.readingMinutes} min read
									</p>
								</article>
							{:else}
								<p class="border-b border-border py-12 text-sm text-muted-foreground">
									No stories in this topic yet.
								</p>
							{/each}
						</div>
					</div>

					<aside
						class="order-first lg:order-last lg:sticky lg:top-[calc(var(--site-topbar-height)+2rem)] lg:self-start">
						<p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							Browse topics
						</p>
						<div
							class="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-start"
							role="group"
							aria-label="Filter stories by topic">
							{#each topics as topic (topic)}
								<button
									type="button"
									onclick={() => (activeTopic = topic)}
									aria-pressed={activeTopic === topic}
									class="border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground {activeTopic ===
									topic
										? 'border-foreground bg-foreground text-background'
										: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}">
									{topic}
								</button>
							{/each}
						</div>
					</aside>
				</div>
			</section>
		</div>
	{:else}
		<div class="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
			<p class="font-serif text-3xl">The first story is being written.</p>
		</div>
	{/if}
</div>
