<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { DotGrid, ScButton, FeatureModule, ProductCard, PlaceholderImage } from '$lib/components/sc';
	import Smoke from '$lib/components/effects/Smoke.svelte';

	let { data } = $props();

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

	const featured = $derived(data.featuredProduct);
	const featuredMaker = $derived(
		featured?.author ?? featured?.users?.username ?? 'unknown'
	);
	const featuredPrice = $derived(
		featured ? featured.price.new.toLocaleString('en-IN') : null
	);
	const featuredOldPrice = $derived(
		featured && featured.price.old > 0
			? featured.price.old.toLocaleString('en-IN')
			: null
	);
	const featuredRating = $derived(featured?.rating);
	const featuredStock = $derived(featured?.stock.count ?? 0);
	const featuredImage = $derived(featured?.images?.[0]?.url ?? null);
	const featuredHref = $derived(featured ? productHref(featured) : '/crafts');
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
				</dl>
			</div>

			{#if featured}
				<a
					href={featuredHref}
					class="group block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30"
				>
					<div
						class="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground"
					>
						<span>Featured</span>
					</div>

					<div class="grid sm:grid-cols-[minmax(0,160px)_1fr]">
						<div class="aspect-square overflow-hidden sm:aspect-auto sm:min-h-full">
							<PlaceholderImage
								src={featuredImage}
								alt={featured.name}
								class="transition-transform duration-500 group-hover:scale-105"
							/>
						</div>

						<div class="flex min-w-0 flex-col justify-between gap-4 p-6">
							<div class="space-y-3">
								<h2 class="text-xl font-medium leading-snug text-foreground">{featured.name}</h2>

								<dl class="space-y-1.5 font-mono text-sm">
									<div class="flex gap-2">
										<dt class="shrink-0 text-muted-foreground">maker:</dt>
										<dd class="truncate text-foreground">@{featuredMaker}</dd>
									</div>
									<div class="flex gap-2">
										<dt class="shrink-0 text-muted-foreground">stock:</dt>
										<dd class="text-foreground">{featuredStock} units</dd>
									</div>
									{#if featuredRating}
										<div class="flex gap-2">
											<dt class="shrink-0 text-muted-foreground">rating:</dt>
											<dd class="text-foreground">
												{featuredRating.rating} / {featuredRating.count} reviews
											</dd>
										</div>
									{/if}
								</dl>
							</div>

							{#if featuredPrice}
								<div class="text-right">
									{#if featuredOldPrice}
										<p class="font-mono text-sm text-muted-foreground line-through">
											₹{featuredOldPrice}
										</p>
									{/if}
									<p class="font-mono text-2xl font-semibold tracking-tight text-foreground">
										₹{featuredPrice}
									</p>
								</div>
							{/if}
						</div>
					</div>
				</a>
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
			{#each features as feature (feature.title)}
				<FeatureModule
					title={feature.title}
					description={feature.description}
				/>
			{/each}
		</div>
	</section>

	<section class="mx-auto max-w-7xl px-4 py-16">
		<div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
			<h2 class="text-sm font-medium text-foreground">Fresh listings</h2>
			<ScButton href="/crafts" variant="ghost" arrow>Browse all</ScButton>
		</div>

		{#if listingPreview.length > 0}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				{#each listingPreview as product (product.id)}
					<ProductCard {product} href={productHref(product)} />
				{/each}
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center"
			>
				<p class="text-sm text-muted-foreground">No listings yet — check back soon</p>
				<div class="mt-4">
					<ScButton href="/crafting" variant="secondary">Start selling</ScButton>
				</div>
			</div>
		{/if}
	</section>
</div>
