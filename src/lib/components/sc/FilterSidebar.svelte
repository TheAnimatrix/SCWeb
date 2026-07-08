<script lang="ts">
	import type { BrowseCategory, BrowseFilters, CategoryCounts, TagOption } from '$lib/types/browse';
	import { cn } from '$lib/utils';
	import { ScInput } from '$lib/components/sc';

	interface Props {
		filters: BrowseFilters;
		categoryCounts: CategoryCounts;
		tagOptions: TagOption[];
		onchange?: (patch: Partial<BrowseFilters>) => void;
		class?: string;
	}

	let { filters, categoryCounts, tagOptions, onchange, class: className }: Props = $props();

	let optimisticInStock = $state<boolean | undefined>(undefined);
	const inStockChecked = $derived(optimisticInStock ?? filters.inStock);

	$effect(() => {
		filters.inStock;
		optimisticInStock = undefined;
	});

	const categories: { value: BrowseCategory; label: string; countKey: keyof CategoryCounts }[] = [
		{ value: 'all', label: 'all', countKey: 'all' },
		{ value: 'products', label: 'products', countKey: 'products' },
		{ value: 'spares', label: 'spares', countKey: 'spares' },
		{ value: 'flea_market', label: 'flea_market', countKey: 'flea_market' }
	];

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

	function toggleTag(tagKey: string) {
		onchange?.({
			tag: filters.tag === tagKey ? null : tagKey,
			page: 1
		});
	}

	function toggleInStock() {
		const next = !inStockChecked;
		optimisticInStock = next;
		onchange?.({ inStock: next, page: 1 });
	}
</script>

<aside class={cn('flex flex-col gap-10', className)} aria-label="Filters">
	<section class="flex flex-col gap-3">
		<p class="font-mono text-xs text-muted-foreground">// category</p>
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

	<section class="flex flex-col gap-3">
		<p class="font-mono text-xs text-muted-foreground">// price_range</p>
		<div class="flex items-center gap-2">
			<ScInput
				type="number"
				min={0}
				placeholder="min"
				size="sm"
				value={filters.minPrice != null ? String(filters.minPrice) : ''}
				onchange={handleMinPriceChange}
				class="font-mono"
			/>
			<span class="font-mono text-xs text-muted-foreground">—</span>
			<ScInput
				type="number"
				min={0}
				placeholder="max"
				size="sm"
				value={filters.maxPrice != null ? String(filters.maxPrice) : ''}
				onchange={handleMaxPriceChange}
				class="font-mono"
			/>
		</div>
	</section>

	{#if tagOptions.length > 0}
		<section class="flex flex-col gap-3">
			<p class="font-mono text-xs text-muted-foreground">// tag</p>
			<div class="flex flex-wrap gap-2">
				{#each tagOptions as tag (tag.key)}
					<button
						type="button"
						onclick={() => toggleTag(tag.key)}
						class={cn(
							'rounded-full border px-3 py-1 font-mono text-xs transition-colors',
							filters.tag === tag.key
								? 'border-black bg-black text-white'
								: 'border-border bg-card text-foreground hover:border-foreground/30'
						)}
					>
						{tag.label}
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<p class="font-mono text-xs text-muted-foreground">// availability</p>
		<label class="flex cursor-pointer items-center justify-between gap-3 font-mono text-sm">
			<span>in_stock</span>
			<button
				type="button"
				role="switch"
				aria-label="Filter in-stock items only"
				aria-checked={inStockChecked}
				onclick={toggleInStock}
				class={cn(
					'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ease-out',
					inStockChecked ? 'border-primary bg-primary' : 'border-border bg-muted'
				)}
			>
				<span
					aria-hidden="true"
					class={cn(
						'absolute left-0.5 top-0.5 size-5 rounded-full bg-primary-foreground shadow-sm transition-transform duration-200 ease-out',
						inStockChecked ? 'translate-x-5' : 'translate-x-0'
					)}
				></span>
			</button>
		</label>
	</section>
</aside>
