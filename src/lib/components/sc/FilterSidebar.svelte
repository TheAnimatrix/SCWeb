<script lang="ts">
	import type { BrowseCategory, BrowseFilters, CategoryCounts } from '$lib/types/browse';
	import { cn } from '$lib/utils';

	interface Props {
		filters: BrowseFilters;
		categoryCounts: CategoryCounts;
		onchange?: (patch: Partial<BrowseFilters>) => void;
		class?: string;
	}

	let { filters, categoryCounts, onchange, class: className }: Props = $props();

	const categories: { value: BrowseCategory; label: string; countKey: keyof CategoryCounts }[] = [
		{ value: 'all', label: 'all', countKey: 'all' },
		{ value: 'products', label: 'products', countKey: 'products' },
		{ value: 'spares', label: 'spares', countKey: 'spares' },
		{ value: 'flea_market', label: 'flea_market', countKey: 'flea_market' }
	];

	const cities = ['BLR', 'MUM', 'PUN', 'DEL', 'HYD'];

	function parsePrice(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		return Number.isNaN(parsed) ? null : parsed;
	}

	function handleMinPriceChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onchange?.({
			minPrice: parsePrice(target.value),
			maxPrice: filters.maxPrice,
			page: 1
		});
	}

	function handleMaxPriceChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onchange?.({
			minPrice: filters.minPrice,
			maxPrice: parsePrice(target.value),
			page: 1
		});
	}

	function toggleCity(city: string) {
		onchange?.({
			city: filters.city === city ? null : city,
			page: 1
		});
	}
</script>

<aside class={cn('flex flex-col gap-8', className)} aria-label="Filters">
	<section>
		<p class="mb-3 font-mono text-xs text-muted-foreground">// category</p>
		<ul class="flex flex-col gap-2">
			{#each categories as category (category.value)}
				<li>
					<label class="flex cursor-pointer items-center gap-2 font-mono text-sm text-foreground">
						<input
							type="checkbox"
							class="size-3.5 rounded border-border accent-black"
							checked={filters.filter === category.value}
							onchange={() => onchange?.({ filter: category.value, page: 1 })}
						/>
						<span class="flex-1">{category.label}</span>
						<span class="text-muted-foreground">{categoryCounts[category.countKey]}</span>
					</label>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<p class="mb-3 font-mono text-xs text-muted-foreground">// price_range</p>
		<div class="flex items-center gap-2">
			<input
				type="number"
				min="0"
				placeholder="min"
				value={filters.minPrice ?? ''}
				onchange={handleMinPriceChange}
				class="h-9 w-full rounded-md border border-border bg-card px-3 font-mono text-sm focus:border-foreground/30 focus:outline-none"
			/>
			<span class="font-mono text-xs text-muted-foreground">—</span>
			<input
				type="number"
				min="0"
				placeholder="max"
				value={filters.maxPrice ?? ''}
				onchange={handleMaxPriceChange}
				class="h-9 w-full rounded-md border border-border bg-card px-3 font-mono text-sm focus:border-foreground/30 focus:outline-none"
			/>
		</div>
	</section>

	<section>
		<p class="mb-3 font-mono text-xs text-muted-foreground">// city</p>
		<div class="flex flex-wrap gap-2">
			{#each cities as city (city)}
				<button
					type="button"
					onclick={() => toggleCity(city)}
					class={cn(
						'rounded-full border px-3 py-1 font-mono text-xs transition-colors',
						filters.city === city
							? 'border-black bg-black text-white'
							: 'border-border bg-card text-foreground hover:border-foreground/30'
					)}
				>
					{city}
				</button>
			{/each}
		</div>
	</section>

	<section>
		<p class="mb-3 font-mono text-xs text-muted-foreground">// availability</p>
		<label class="flex cursor-pointer items-center justify-between gap-3 font-mono text-sm">
			<span>in_stock</span>
			<button
				type="button"
				role="switch"
				aria-label="Filter in-stock items only"
				aria-checked={filters.inStock}
				onclick={() => onchange?.({ inStock: !filters.inStock, page: 1 })}
				class={cn(
					'relative h-6 w-11 rounded-full border transition-colors',
					filters.inStock ? 'border-primary bg-primary' : 'border-border bg-muted'
				)}
			>
				<span
					class={cn(
						'absolute top-0.5 size-5 rounded-full bg-primary-foreground transition-transform',
						filters.inStock ? 'translate-x-5' : 'translate-x-0.5'
					)}
				></span>
			</button>
		</label>
	</section>
</aside>
