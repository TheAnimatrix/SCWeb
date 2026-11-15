<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { navigating } from '$app/state';
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import {
		DotGrid,
		ScButton,
		FeatureModule,
		ProductCard,
		ProductCardList,
		ProductCardListItem,
		ProductCardSkeleton,
		FeaturedCarousel,
		FeaturedCarouselSkeleton,
		Skeleton
	} from '$lib/components/sc';
	import Smoke from '$lib/components/effects/Smoke.svelte';
	import { SeoHead, JsonLd } from '$lib/components/seo';
	import { homeSeo, organizationJsonLd, websiteJsonLd } from '$lib/seo/meta';
	import { absoluteUrl } from '$lib/seo/site';
	import { productPath } from '$lib/seo/product';
	import { page } from '$app/state';

	let { data } = $props();

	const isLoading = $derived(
		data.pending || (!!navigating.to && navigating.to.url.pathname === '/')
	);

	const features = [
		{
			title: 'Products',
			description:
				'Boards, tools and kits built by makers in India. Every listing names the maker who made it.'
		},
		{
			title: 'Spares and flea market',
			description:
				"Replacement parts for things you already own, and surplus parts from other makers' benches."
		},
		{
			title: '3D printing',
			description:
				'Upload an STL, pick a material and colour, and ask a maker who owns a printer for a quote.'
		}
	];

	function productHref(product: Product) {
		return productPath(product);
	}

	const listingPreview = $derived(data.recentProducts.slice(0, 4));
	const sparesPreview = $derived(data.recentSpares.slice(0, 4));
	const fleaMarketPreview = $derived(data.recentFleaMarket.slice(0, 4));
	const featuredProducts = $derived(data.featuredProducts);
	const featuredLabel = $derived(data.featuredIsCurated ? 'Featured' : 'Newest');
	const stats = $derived(data.stats);

	/** Home shows 4 cards per section, so cap the grid at 4 columns (no empty 5th slot). */
	const HOME_GRID_CLASS = '@min-[1060px]:grid-cols-4';

	const listingSectionMeta = [
		{
			id: 'products',
			title: 'Products',
			icon: F.box,
			browseHref: '/crafts?filter=products',
			emptyMessage: 'Nothing listed here yet.'
		},
		{
			id: 'spares',
			title: 'Spares',
			icon: F.puzzleCube,
			browseHref: '/crafts?filter=spares',
			emptyMessage: 'No spares listed yet.'
		},
		{
			id: 'flea_market',
			title: 'Flea market',
			icon: F.buildingShop,
			browseHref: '/crafts?filter=flea_market',
			emptyMessage: 'Nothing in the flea market yet.'
		}
	] as const;

	const listingSections = $derived(
		[listingPreview, sparesPreview, fleaMarketPreview].map((items, index) => ({
			...listingSectionMeta[index],
			items
		}))
	);
</script>

<SeoHead meta={{ ...homeSeo, canonical: absoluteUrl('/', page.url.origin) }} />
<JsonLd data={[organizationJsonLd(page.url.origin), websiteJsonLd(page.url.origin)]} />

<div class="min-h-screen bg-background text-foreground">
	<DotGrid class="relative overflow-hidden border-b border-border">
		<Smoke variant="fabric" opacity={1} particleCount={150} gridSize={8} />
		<div
			class="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 pt-6 pb-12 md:grid-cols-2 md:items-center md:gap-12 md:py-24">
			<div class="flex flex-col gap-6 md:gap-8">
				<div class="space-y-4">
					<h1 class="text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
						Hardware from India's independent makers.
					</h1>
					<p class="max-w-lg text-base leading-relaxed text-muted-foreground">
						Buy finished products, find spares for the things you already own, or pick up surplus
						parts from the flea market. If you build hardware, you can sell here too.
					</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<ScButton href="/crafts" arrow>Browse the shop</ScButton>
					<ScButton href="/crafting" variant="secondary">Start selling</ScButton>
				</div>

				{#if isLoading}
					<div class="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-6">
						{#each [...Array(3).keys()] as i (i)}
							<Skeleton class="h-4 w-28 rounded-sm" />
						{/each}
					</div>
				{:else if stats}
					<dl class="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-6 font-mono text-sm">
						<div>
							<dt class="inline text-muted-foreground">makers:</dt>
							<dd class="ml-1 inline text-foreground">{stats.makers}</dd>
						</div>
						<div>
							<dt class="inline text-muted-foreground">listings:</dt>
							<dd class="ml-1 inline text-foreground">{stats.listings}</dd>
						</div>
						<div>
							<dt class="inline text-muted-foreground">members:</dt>
							<dd class="ml-1 inline text-foreground">{stats.users}</dd>
						</div>
					</dl>
				{/if}
			</div>

			{#if isLoading}
				<FeaturedCarouselSkeleton />
			{:else if featuredProducts.length > 0}
				<FeaturedCarousel products={featuredProducts} {productHref} label={featuredLabel} />
			{/if}
		</div>
	</DotGrid>

	<section class="border-b border-border bg-background">
		<div class="mx-auto grid max-w-7xl auto-rows-fr grid-cols-1 md:grid-cols-3">
			{#each features as feature, i (feature.title)}
				<FeatureModule title={feature.title} description={feature.description} index={i} />
			{/each}
		</div>
	</section>

	<div class="mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-16">
		{#each listingSections as section (section.title)}
			<section>
				<div
					class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
					<div
						class="flex items-center gap-2.5 rounded-md bg-foreground px-2.5 py-1 text-background">
						<Icon icon={section.icon} class="size-3.5 shrink-0" aria-hidden="true" />
						<h2 class="text-sm font-medium">{section.title}</h2>
					</div>
					<ScButton href={section.browseHref} variant="ghost" arrow>Browse all</ScButton>
				</div>

				{#if isLoading}
					<ProductCardList
						class={HOME_GRID_CLASS}
						aria-busy="true"
						aria-label="Loading {section.title.toLowerCase()}">
						{#each [...Array(4).keys()] as i (i)}
							<ProductCardListItem>
								<ProductCardSkeleton />
							</ProductCardListItem>
						{/each}
					</ProductCardList>
				{:else if data.apiError}
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center"
						role="status">
						<p class="text-sm text-muted-foreground">Listings didn't load. Refresh to try again.</p>
					</div>
				{:else if section.items.length > 0}
					<ProductCardList class={HOME_GRID_CLASS}>
						{#each section.items as product (product.id)}
							<ProductCardListItem>
								<ProductCard {product} href={productHref(product)} singleLineTitle dimOutOfStock />
							</ProductCardListItem>
						{/each}
					</ProductCardList>
				{:else}
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
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
