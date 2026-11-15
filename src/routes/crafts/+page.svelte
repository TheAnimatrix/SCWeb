<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { afterNavigate, goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { tick } from 'svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import {
		FilterSidebar,
		Pagination,
		ProductCard,
		ProductCardList,
		ProductCardListItem,
		ProductCardSkeleton,
		SearchBar,
		Skeleton
	} from '$lib/components/sc';
	import type { BrowseFilters, BrowseSort } from '$lib/types/browse';
	import type { Product } from '$lib/types/product';
	import { formatActiveTagLabel } from '$lib/utils/browseTags';
	import { formatInr } from '$lib/utils/format';
	import { productPath } from '$lib/seo/product';
	import { SeoHead } from '$lib/components/seo';
	import { craftsSeo } from '$lib/seo/meta';
	import { absoluteUrl } from '$lib/seo/site';

	interface ActiveFilterChip {
		id: string;
		label: string;
		patch: Partial<BrowseFilters>;
	}

	let { data } = $props();

	let mobileFiltersOpen = $state(false);
	let filtersCloseButton = $state<HTMLButtonElement | null>(null);
	let filtersTrigger = $state<HTMLButtonElement | null>(null);

	// Only a navigation that stays on /crafts refreshes the grid; leaving for a product must not.
	const isRefreshing = $derived(
		page.url.pathname.startsWith('/crafts') && navigating.to?.url.pathname === '/crafts'
	);

	const CATEGORY_LABELS: Record<BrowseFilters['filter'], string> = {
		all: 'All',
		products: 'Products',
		spares: 'Spares',
		flea_market: 'Flea market'
	};

	const sortOptions: { value: BrowseSort; label: string }[] = [
		{ value: 'newest', label: 'Newest' },
		{ value: 'price_asc', label: 'Price: low to high' },
		{ value: 'price_desc', label: 'Price: high to low' }
	];

	const activeFilterChips = $derived.by((): ActiveFilterChip[] => {
		const chips: ActiveFilterChip[] = [];

		if (data.filters.filter !== 'all') {
			chips.push({
				id: 'filter',
				label: CATEGORY_LABELS[data.filters.filter],
				patch: { filter: 'all', page: 1 }
			});
		}

		if (data.filters.q) {
			chips.push({
				id: 'q',
				label: `Search: ${data.filters.q}`,
				patch: { q: '', page: 1 }
			});
		}

		if (data.filters.tag) {
			chips.push({
				id: 'tag',
				label: formatActiveTagLabel(data.filters.tag, data.allTagOptions),
				patch: { tag: null, page: 1 }
			});
		}

		if (data.filters.minPrice != null || data.filters.maxPrice != null) {
			const min = data.filters.minPrice != null ? formatInr(data.filters.minPrice) : '₹0';
			const max = data.filters.maxPrice != null ? formatInr(data.filters.maxPrice) : 'any';
			chips.push({
				id: 'price',
				label: `${min} to ${max}`,
				patch: { minPrice: null, maxPrice: null, page: 1 }
			});
		}

		if (data.filters.inStock) {
			chips.push({
				id: 'inStock',
				label: 'In stock only',
				patch: { inStock: false, page: 1 }
			});
		}

		return chips;
	});

	const hasActiveFilters = $derived(activeFilterChips.length > 0);

	function productHref(product: Product): string {
		return productPath(product);
	}

	function buildSearchParams(patch: Partial<BrowseFilters> = {}): URLSearchParams {
		const next: BrowseFilters = { ...data.filters, ...patch };
		const params = new URLSearchParams();

		if (next.filter !== 'all') params.set('filter', next.filter);
		if (next.q) params.set('q', next.q);
		if (next.tag) params.set('tag', next.tag);
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
		// The mobile drawer stays open so several filters can be set in a row;
		// "Show N results" closes it.

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

	function clearFilters() {
		goto('/crafts', { keepFocus: true, noScroll: false });
	}

	async function openMobileFilters() {
		mobileFiltersOpen = true;
		await tick();
		filtersCloseButton?.focus();
	}

	function closeMobileFilters() {
		mobileFiltersOpen = false;
		filtersTrigger?.focus();
	}

	// Body scroll lock and Escape while the mobile drawer is open (same as the header sheet).
	$effect(() => {
		if (!mobileFiltersOpen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		function onKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') closeMobileFilters();
		}

		window.addEventListener('keydown', onKeydown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKeydown);
		};
	});

	// The header search icon links to /crafts#search: put the cursor in the box.
	afterNavigate(() => {
		if (page.url.hash === '#search') {
			document.getElementById('search')?.focus();
		}
	});
</script>

<SeoHead
	meta={{
		...craftsSeo,
		canonical: absoluteUrl(`${page.url.pathname}${page.url.search}`, page.url.origin)
	}} />

<div class="min-h-screen w-full bg-background text-foreground">
	<div class="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />

		<div class="mt-6 flex flex-col gap-6">
			<SearchBar
				value={data.filters.q}
				onsearch={handleSearch}
				inputId="search"
				class="w-full max-w-xl" />

			<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div class="min-w-0">
					<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Shop</h1>
					<p class="mt-1 text-sm text-muted-foreground" aria-live="polite">
						{#if isRefreshing}
							<Skeleton class="inline-block h-4 w-32 rounded-sm align-middle" />
						{:else if !data.apiError}
							{data.totalCount} result{data.totalCount === 1 ? '' : 's'}
						{/if}
					</p>
				</div>

				<label class="flex w-full items-center gap-2 text-sm text-muted-foreground sm:w-auto">
					<span>Sort</span>
					<select
						value={data.filters.sort}
						onchange={handleSortChange}
						class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none sm:w-auto">
						{#each sortOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>
		</div>

		<div class="mt-8 md:mt-10">
			{#if hasActiveFilters}
				<div class="mb-4 flex flex-wrap items-center gap-2">
					<p class="w-full text-sm text-muted-foreground sm:w-auto">Active filters</p>
					{#each activeFilterChips as chip (chip.id)}
						<button
							type="button"
							onclick={() => navigate(chip.patch)}
							class="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 py-1 text-sm text-background transition-colors hover:bg-foreground/90">
							{chip.label}
							<Icon icon={F.dismiss} class="size-3 shrink-0" aria-hidden="true" />
							<span class="sr-only">Remove {chip.label} filter</span>
						</button>
					{/each}
					<button
						type="button"
						onclick={clearFilters}
						class="min-h-9 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
						Clear filters
					</button>
				</div>
			{/if}

			<div class="mb-4 flex items-center justify-between md:hidden">
				<button
					type="button"
					bind:this={filtersTrigger}
					onclick={openMobileFilters}
					aria-haspopup="dialog"
					aria-expanded={mobileFiltersOpen}
					class="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors hover:border-foreground/30">
					<Icon icon={F.options} class="size-4" aria-hidden="true" />
					Filters
				</button>
				{#if hasActiveFilters}
					<button
						type="button"
						onclick={clearFilters}
						class="min-h-10 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
						Clear filters
					</button>
				{/if}
			</div>

			<div class="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
				<FilterSidebar
					filters={data.filters}
					categoryCounts={data.categoryCounts}
					tagGroups={data.tagGroups}
					standaloneTags={data.standaloneTags}
					onchange={navigate}
					class="hidden md:sticky md:top-[5.25rem] md:flex md:self-start" />

				<div class="min-w-0">
					{#if isRefreshing}
						<ProductCardList aria-busy="true" aria-label="Loading listings">
							{#each [...Array(6).keys()] as i (i)}
								<ProductCardListItem>
									<ProductCardSkeleton />
								</ProductCardListItem>
							{/each}
						</ProductCardList>
					{:else if data.apiError}
						<div
							class="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center"
							role="status">
							<p class="max-w-md text-sm text-foreground">
								Search is unavailable right now. Try again in a minute.
							</p>
						</div>
					{:else if data.products.length > 0}
						<ProductCardList>
							{#each data.products as product (product.id)}
								<ProductCardListItem>
									<ProductCard {product} href={productHref(product)} dimOutOfStock />
								</ProductCardListItem>
							{/each}
						</ProductCardList>

						<Pagination
							currentPage={data.currentPage}
							totalPages={data.totalPages}
							{hrefForPage}
							class="mt-10 justify-center" />
					{:else}
						<div
							class="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
							<p class="max-w-md text-sm text-foreground">
								{#if data.filters.q}
									Nothing matches "{data.filters.q}". Try a shorter search or clear filters.
								{:else}
									Nothing matches these filters. Try clearing some.
								{/if}
							</p>
							{#if hasActiveFilters}
								<button
									type="button"
									onclick={clearFilters}
									class="mt-4 min-h-10 text-sm text-foreground underline-offset-4 hover:underline">
									Clear filters
								</button>
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
			tabindex="-1"
			onclick={closeMobileFilters}></button>

		<div
			class="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl border-t border-border bg-background shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Filters">
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<p class="text-base font-medium text-foreground">Filters</p>
				<button
					type="button"
					bind:this={filtersCloseButton}
					class="inline-flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
					aria-label="Close filters"
					onclick={closeMobileFilters}>
					<Icon icon={F.dismiss} class="size-4" />
				</button>
			</div>

			<div class="overflow-y-auto px-4 py-4">
				<FilterSidebar
					filters={data.filters}
					categoryCounts={data.categoryCounts}
					tagGroups={data.tagGroups}
					standaloneTags={data.standaloneTags}
					onchange={navigate} />
			</div>

			<div class="border-t border-border bg-background px-4 py-3">
				<button
					type="button"
					class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
					disabled={isRefreshing}
					onclick={closeMobileFilters}>
					{#if isRefreshing}
						Updating results…
					{:else if data.apiError}
						Close
					{:else}
						Show {data.totalCount} result{data.totalCount === 1 ? '' : 's'}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
