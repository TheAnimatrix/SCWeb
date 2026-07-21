<script lang="ts">
	import { page } from '$app/state';
	import { SeoHead } from '$lib/components/seo';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';
	import { productPath } from '$lib/seo/product';
	import { absoluteUrl } from '$lib/seo/site';
	import { cn } from '$lib/utils';

	let { data } = $props();

	type Storefront = {
		handle: string;
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

	function productHref(name: string, id: string) {
		return productPath({ id, name });
	}
</script>

<SeoHead
	meta={{
		title: `${title} · Maker`,
		description: storefront.tagline || storefront.bio || `Shop products from ${title} on Selfcrafted.`,
		canonical,
		image: storefront.banner_url || storefront.avatar_url || undefined,
		imageAlt: `${title} storefront`
	}} />

<div class="min-h-screen bg-background text-foreground">
	<div
		class="relative h-40 w-full overflow-hidden border-b border-border bg-gradient-to-br from-muted via-background to-muted md:h-52">
		{#if storefront.banner_url}
			<img src={storefront.banner_url} alt="" class="h-full w-full object-cover" />
		{/if}
	</div>

	<div class="mx-auto max-w-6xl px-4">
		<div class="-mt-10 flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
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
				{#if storefront.location}
					<p class="mt-1 text-xs text-muted-foreground">{storefront.location}</p>
				{/if}
				{#if storefront.capabilities?.length}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each storefront.capabilities as cap (cap)}
							<span
								class="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
								{cap.replaceAll('_', ' ')}
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
					'border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wide',
					tab === 'store'
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}>
				Main Store
			</a>
			<a
				href="?tab=details"
				class={cn(
					'border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wide',
					tab === 'details'
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}>
				Details
			</a>
		</nav>

		{#if tab === 'store'}
			<section class="py-8">
				{#if storefront.products.length === 0}
					<p class="text-sm text-muted-foreground">No live listings yet.</p>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each storefront.products as product (product.id)}
							<a
								href={productHref(product.name, product.id)}
								class="group block overflow-hidden rounded-md border border-border bg-card transition hover:border-foreground/30">
								<div class="aspect-[4/3] bg-muted">
									{#if product.images?.[0]?.url}
										<img
											src={product.images[0].url}
											alt={product.name}
											class="h-full w-full object-cover transition group-hover:scale-[1.02]" />
									{/if}
								</div>
								<div class="p-3">
									<h2 class="truncate text-sm font-medium">{product.name}</h2>
									{#if product.price}
										<p class="mt-1 font-mono text-sm">₹{product.price.new}</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{:else}
			<section class="space-y-6 py-8">
				{#if storefront.bio}
					<div>
						<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h2>
						<p class="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed">{storefront.bio}</p>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No details published yet.</p>
				{/if}

				{#if storefront.printing}
					<div>
						<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							3D printing
						</h2>
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
