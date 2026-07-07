<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { navigating } from '$app/state';
	import Icon from '@iconify/svelte';
	import {
		DotGrid,
		ScButton,
		FeatureModule,
		ProductCard,
		ProductCardSkeleton,
		FeaturedCarousel,
		FeaturedCarouselSkeleton,
		Skeleton
	} from '$lib/components/sc';
	import Smoke from '$lib/components/effects/Smoke.svelte';

	let { data } = $props();

	const isLoading = $derived(!!navigating.to && navigating.to.url.pathname === '/');

	const features = [
		{
			title: 'Maker Marketplace',
			description:
				'Buy and sell finished products and critical components on one platform built for indie hardware.'
		},
		{
			title: 'Local Sourcing',
			description:
				'Reduce dependency on expensive imports by connecting with component makers in your city.'
		},
		{
			title: 'Creator Community',
			description:
				'Join a network of indie creators solving common sourcing and scaling challenges together.'
		}
	];

	function productHref(product: Product) {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	}

	const listingPreview = $derived(data.recentProducts.slice(0, 3));
	const sparesPreview = $derived(data.recentSpares.slice(0, 3));
	const fleaMarketPreview = $derived(data.recentFleaMarket.slice(0, 3));
	const featuredProducts = $derived(data.featuredProducts);

	const listingSectionMeta = [
		{
			id: 'products',
			title: 'Fresh listings',
			icon: 'fluent:sparkle-24-regular',
			browseHref: '/crafts?filter=products',
			emptyMessage: 'No listings yet — check back soon'
		},
		{
			id: 'spares',
			title: 'Spares',
			icon: 'fluent:puzzle-cube-24-regular',
			browseHref: '/crafts?filter=spares',
			emptyMessage: 'No spares listed yet — check back soon'
		},
		{
			id: 'flea_market',
			title: 'Flea market',
			icon: 'fluent:building-shop-24-regular',
			browseHref: '/crafts?filter=flea_market',
			emptyMessage: 'No flea market listings yet — check back soon'
		}
	] as const;

	const listingSections = $derived(
		[listingPreview, sparesPreview, fleaMarketPreview].map((items, index) => ({
			...listingSectionMeta[index],
			items
		}))
	);
</script>

<div class="min-h-screen bg-background text-foreground">
	<DotGrid class="relative overflow-hidden border-b border-border">
		<Smoke variant="fabric" opacity={1} particleCount={150} gridSize={8} />
		<div class="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
			<div class="flex flex-col gap-8">
				<div class="space-y-4">
					<h1 class="text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
						Parts, products & people.
					</h1>
					<p class="max-w-lg text-base leading-relaxed text-muted-foreground">
						Marketplace infrastructure for indie hardware — source parts locally, ship finished
						products, and connect with makers building in the open.
					</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<ScButton href="/crafts" arrow>Browse crafts</ScButton>
					<ScButton href="/crafting" variant="secondary">Start selling</ScButton>
				</div>

				<dl class="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-6 font-mono text-sm">
					{#if isLoading}
						{#each Array(3) as _, i (i)}
							<Skeleton class="h-4 w-28 rounded-sm" />
						{/each}
					{:else}
						<div>
							<dt class="inline text-muted-foreground">makers:</dt>
							<dd class="ml-1 inline text-foreground">{data.stats.makers}</dd>
						</div>
						<div>
							<dt class="inline text-muted-foreground">listings:</dt>
							<dd class="ml-1 inline text-foreground">{data.stats.listings}</dd>
						</div>
						<div>
							<dt class="inline text-muted-foreground">cities:</dt>
							<dd class="ml-1 inline text-foreground">{data.stats.cities}</dd>
						</div>
					{/if}
				</dl>
			</div>

			{#if isLoading}
				<FeaturedCarouselSkeleton />
			{:else if featuredProducts.length > 0}
				<FeaturedCarousel products={featuredProducts} {productHref} />
			{:else}
				<div
					class="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-card p-8"
				>
					<p class="font-mono text-sm text-muted-foreground">no featured craft yet</p>
				</div>
			{/if}
		</div>
	</DotGrid>

	<section class="border-b border-border bg-background">
		<div class="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-3">
			{#each features as feature, i (feature.title)}
				<FeatureModule
					title={feature.title}
					description={feature.description}
					index={i}
				/>
			{/each}
		</div>
	</section>

	<div class="mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-16">
		{#each listingSections as section (section.title)}
			<section>
				<div class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
					<div class="flex items-center gap-2.5">
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground"
							aria-hidden="true"
						>
							<Icon icon={section.icon} class="size-3.5" aria-hidden="true" />
						</span>
						<h2 class="text-sm font-medium text-foreground">{section.title}</h2>
					</div>
					<ScButton href={section.browseHref} variant="ghost" arrow>Browse all</ScButton>
				</div>

			{#if isLoading}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3" aria-hidden="true">
					{#each Array(3) as _, i (i)}
						<ProductCardSkeleton />
					{/each}
				</div>
			{:else if section.items.length > 0}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					{#each section.items as product (product.id)}
						<ProductCard {product} href={productHref(product)} />
					{/each}
				</div>
			{:else}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center"
				>
					<p class="text-sm text-muted-foreground">{section.emptyMessage}</p>
					{#if section.id === 'products'}
						<div class="mt-4">
							<ScButton href="/crafting" variant="secondary">Start selling</ScButton>
						</div>
					{/if}
				</div>
			{/if}
			</section>
		{/each}
	</div>
</div>
