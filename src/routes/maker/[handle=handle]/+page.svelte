<script lang="ts">
	import { page } from '$app/state';
	import { SeoHead } from '$lib/components/seo';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';
	import { productPath } from '$lib/seo/product';
	import { absoluteUrl } from '$lib/seo/site';
	import { cn } from '$lib/utils';
	import { formatMonthYear } from '$lib/utils/format';
	import { ProductCard, ProductCardList, ProductCardListItem } from '$lib/components/sc';
	import type { Product } from '$lib/types/product';

	let { data } = $props();

	type Storefront = {
		maker_id: string;
		handle: string;
		tier: string | null;
		published_at: string | null;
		display_name: string | null;
		tagline: string | null;
		bio: string | null;
		avatar_url: string | null;
		banner_url: string | null;
		location: string | null;
		capabilities: string[];
		products: Array<{
			id: string;
			name: string;
			price: { new: number; old: number } | null;
			images: { url: string }[] | null;
			type: string | null;
			stock: { count: number; status: string } | null;
			author: string | null;
		}>;
		printing: {
			max_printer_size: string | null;
			number_of_printers: number | null;
			filament_types: string[] | null;
		} | null;
	};

	const storefront = $derived(data.storefront as Storefront);
	const tab = $derived(data.tab as 'store' | 'details');
	const title = $derived(storefront.display_name || formatUsernameDisplay(storefront.handle));
	const canonical = $derived(absoluteUrl(makerStorefrontPath(storefront.handle), page.url.origin));

	const CAPABILITY_LABELS: Record<string, string> = {
		physical_goods: 'Physical goods',
		printing_3d: '3D printing',
		digital_goods: 'Digital goods'
	};

	function capabilityLabel(key: string): string {
		const label = CAPABILITY_LABELS[key] ?? key.replaceAll('_', ' ');
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	const sellingSince = $derived(formatMonthYear(storefront.published_at));
	const listingCount = $derived(storefront.products.length);

	/** Storefront rows carry fewer fields than the catalog; fill the rest for ProductCard. */
	const products = $derived(
		storefront.products.map((item): Product => ({
			id: item.id,
			name: item.name,
			images: item.images ?? [],
			tags: [],
			stock: item.stock ?? { count: 0, status: 'unknown' },
			price: item.price ?? { old: 0, new: 0 },
			type: item.type ?? '',
			author: item.author ?? undefined,
			users: { username: storefront.handle, tier: storefront.tier },
			uid: storefront.maker_id,
			created_at: '',
			guarantee: '',
			rel: ''
		}))
	);
</script>

<SeoHead
	meta={{
		title: `${title} · Maker`,
		description:
			storefront.tagline || storefront.bio || `Shop products from ${title} on Selfcrafted.`,
		canonical,
		image: storefront.banner_url || storefront.avatar_url || undefined,
		imageAlt: `${title} storefront`
	}} />

<div class="min-h-screen bg-background text-foreground">
	{#if storefront.banner_url}
		<div class="relative h-40 w-full overflow-hidden border-b border-border md:h-52">
			<img src={storefront.banner_url} alt="" class="h-full w-full object-cover" />
		</div>
	{/if}

	<div class="mx-auto max-w-6xl px-4">
		<div
			class={cn(
				'flex flex-col gap-4 md:flex-row md:items-end md:gap-6',
				storefront.banner_url ? '-mt-10' : 'pt-8'
			)}>
			{#if storefront.avatar_url}
				<img
					src={storefront.avatar_url}
					alt=""
					class="size-20 rounded-full border-2 border-background object-cover shadow-sm" />
			{:else}
				<div
					class="flex size-20 items-center justify-center rounded-full border-2 border-background bg-muted text-xl font-semibold shadow-sm">
					{title.slice(0, 1).toUpperCase()}
				</div>
			{/if}
			<div class="pb-1">
				<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
				<p class="font-mono text-sm text-muted-foreground">@{storefront.handle}</p>
				{#if storefront.tagline}
					<p class="mt-1 max-w-2xl text-sm text-muted-foreground">{storefront.tagline}</p>
				{/if}
				<p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
					{#if storefront.location}
						<span>Ships from {storefront.location}</span>
					{/if}
					{#if sellingSince}
						<span>Selling since {sellingSince}</span>
					{/if}
					<span>{listingCount} listing{listingCount === 1 ? '' : 's'}</span>
				</p>
				{#if storefront.capabilities?.length}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each storefront.capabilities as cap (cap)}
							<span class="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
								{capabilityLabel(cap)}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<nav class="mt-8 flex gap-1 border-b border-border" aria-label="Storefront tabs">
			<a
				href="?tab=store"
				class={cn(
					'inline-flex min-h-11 items-center border-b-2 px-3 py-2 text-sm font-medium',
					tab === 'store'
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}>
				Shop
			</a>
			<a
				href="?tab=details"
				class={cn(
					'inline-flex min-h-11 items-center border-b-2 px-3 py-2 text-sm font-medium',
					tab === 'details'
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}>
				About
			</a>
		</nav>

		{#if tab === 'store'}
			<section class="space-y-6 py-8">
				{#if storefront.bio}
					<div class="max-w-3xl">
						<p class="line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
							{storefront.bio}
						</p>
						<a
							href="?tab=details"
							class="mt-1 inline-block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
							More about {title}
						</a>
					</div>
				{/if}

				{#if products.length === 0}
					<p class="text-sm text-muted-foreground">No live listings yet.</p>
				{:else}
					<ProductCardList>
						{#each products as product (product.id)}
							<ProductCardListItem>
								<ProductCard {product} href={productPath(product)} dimOutOfStock />
							</ProductCardListItem>
						{/each}
					</ProductCardList>
				{/if}
			</section>
		{:else}
			<section class="space-y-6 py-8">
				{#if storefront.bio}
					<div>
						<h2 class="text-base font-medium text-foreground">About</h2>
						<p class="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed">
							{storefront.bio}
						</p>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No details published yet.</p>
				{/if}

				{#if storefront.printing}
					<div>
						<h2 class="text-base font-medium text-foreground">3D printing</h2>
						<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
							{#if storefront.printing.max_printer_size}
								<li>Build volume: {storefront.printing.max_printer_size}</li>
							{/if}
							{#if storefront.printing.number_of_printers}
								<li>Printers: {storefront.printing.number_of_printers}</li>
							{/if}
							{#if storefront.printing.filament_types?.length}
								<li>Materials: {storefront.printing.filament_types.join(', ')}</li>
							{/if}
						</ul>
						<a href="/3dp-portal" class="mt-3 inline-block text-sm underline">Request a print</a>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>
