<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import { Breadcrumbs } from '$lib/components/shell';
	import {
		FilterSidebar,
		Pagination,
		ProductCard,
		ProductCardSkeleton,
		SearchBar,
		Skeleton
	} from '$lib/components/sc';
	import type { BrowseFilters, BrowseSort } from '$lib/types/browse';
	import type { Product } from '$lib/types/product';

	let { data } = $props();

	let mobileFiltersOpen = $state(false);

	const isRefreshing = $derived(
		page.url.pathname.startsWith('/crafts') && !!navigating.to
	);

	const sortOptions: { value: BrowseSort; label: string }[] = [
		{ value: 'newest', label: 'newest' },
		{ value: 'price_asc', label: 'price ↑' },
		{ value: 'price_desc', label: 'price ↓' }
	];

	function productHref(product: Product): string {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	}

	function buildSearchParams(patch: Partial<BrowseFilters> = {}): URLSearchParams {
		const next: BrowseFilters = { ...data.filters, ...patch };
		const params = new URLSearchParams();

		if (next.filter !== 'all') params.set('filter', next.filter);
		if (next.q) params.set('q', next.q);
		if (next.city) params.set('city', next.city);
		if (next.minPrice != null) params.set('minPrice', String(next.minPrice));
		if (next.maxPrice != null) params.set('maxPrice', String(next.maxPrice));
		if (next.inStock) params.set('inStock', 'true');
		if (next.sort !== 'newest') params.set('sort', next.sort);
		if (next.page > 1) params.set('page', String(next.page));

		return params;
	}

	function navigate(patch: Partial<BrowseFilters> = {}) {
		const params = buildSearchParams(patch);
		const query = params.toString();
		mobileFiltersOpen = false;

		if (query) {
			goto(`?${query}`, { keepFocus: true, noScroll: false });
			return;
		}

		goto('/crafts', { keepFocus: true, noScroll: false });
	}

	function hrefForPage(targetPage: number): string {
		const params = buildSearchParams({ page: targetPage });
		const query = params.toString();
		return query ? `/crafts?${query}` : '/crafts';
	}

	function handleSearch(query: string) {
		navigate({ q: query, page: 1 });
	}

	function handleSortChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		navigate({ sort: target.value as BrowseSort, page: 1 });
	}
</script>

<div class="min-h-screen w-full bg-background text-foreground">
	<div class="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'crafts' }
			]}
		/>

		<div class="mt-6 flex flex-col gap-6">
			<SearchBar value={data.filters.q} onsearch={handleSearch} class="w-full max-w-xl" />

			<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div class="min-w-0">
					<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Browse creations</h1>
					<p class="mt-1 font-mono text-sm text-muted-foreground">
						{#if isRefreshing}
							<Skeleton class="inline-block h-4 w-32 rounded-sm align-middle" />
						{:else}
							{data.totalCount} result{data.totalCount === 1 ? '' : 's'}
							<span aria-hidden="true"> · </span>
							sort: {data.filters.sort}
						{/if}
					</p>
				</div>

				<label
					class="flex w-full items-center gap-2 font-mono text-xs text-muted-foreground sm:w-auto"
				>
					<span>sort</span>
					<select
						value={data.filters.sort}
						onchange={handleSortChange}
						class="h-9 w-full rounded-md border border-border bg-card px-3 font-mono text-sm text-foreground focus:border-foreground/30 focus:outline-none sm:w-auto"
					>
						{#each sortOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>
		</div>

		<div class="mt-8 md:mt-10">
			<div class="mb-4 flex items-center justify-between md:hidden">
				<button
					type="button"
					onclick={() => (mobileFiltersOpen = true)}
					class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 font-mono text-xs text-foreground transition-colors hover:border-foreground/30"
				>
					<SlidersHorizontal class="size-3.5" aria-hidden="true" />
					filters
				</button>
				{#if page.url.search}
					<a
						href="/crafts"
						class="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					>
						clear_filters →
					</a>
				{/if}
			</div>

			<div class="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
				<FilterSidebar
					filters={data.filters}
					categoryCounts={data.categoryCounts}
					onchange={navigate}
					class="hidden md:sticky md:top-[5.25rem] md:flex md:self-start"
				/>

				<div class="min-w-0">
					{#if isRefreshing}
						<div
							class="grid grid-cols-2 gap-3 lg:gap-4 lg:grid-cols-4"
							aria-busy="true"
							aria-label="Loading crafts"
						>
							{#each Array(6) as _, i (i)}
								<ProductCardSkeleton />
							{/each}
						</div>
					{:else if data.products.length > 0}
						<div class="grid grid-cols-2 gap-3 lg:gap-4 lg:grid-cols-4">
							{#each data.products as product (product.id)}
								<ProductCard {product} href={productHref(product)} />
							{/each}
						</div>

						<Pagination
							currentPage={data.currentPage}
							totalPages={data.totalPages}
							{hrefForPage}
							class="mt-10 justify-center"
						/>
					{:else}
						<div
							class="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center"
						>
							<p class="font-mono text-sm text-muted-foreground">no_results</p>
							<p class="mt-2 max-w-md text-sm text-foreground">
								No creations match your filters. Try adjusting search or clearing filters.
							</p>
							{#if page.url.search}
								<a
									href="/crafts"
									class="mt-4 font-mono text-xs text-foreground underline-offset-4 hover:underline"
								>
									clear_filters →
								</a>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

{#if mobileFiltersOpen}
	<div class="fixed inset-0 z-50 md:hidden">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close filters"
			onclick={() => (mobileFiltersOpen = false)}
		></button>

		<div
			class="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl border-t border-border bg-background shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Filters"
		>
			<div
				class="flex items-center justify-between border-b border-border px-4 py-3"
			>
				<p class="font-mono text-sm text-foreground">// filters</p>
				<button
					type="button"
					class="inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
					aria-label="Close filters"
					onclick={() => (mobileFiltersOpen = false)}
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="overflow-y-auto px-4 py-4">
				<FilterSidebar
					filters={data.filters}
					categoryCounts={data.categoryCounts}
					onchange={navigate}
				/>
			</div>
		</div>
	</div>
{/if}
