<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type {
		BrowseCategory,
		BrowseFilters,
		CategoryCounts,
		TagGroup,
		TagOption
	} from '$lib/types/browse';
	import { cn } from '$lib/utils';
	import { ScInput } from '$lib/components/sc';

	interface Props {
		filters: BrowseFilters;
		categoryCounts: CategoryCounts;
		tagGroups: TagGroup[];
		standaloneTags: TagOption[];
		onchange?: (patch: Partial<BrowseFilters>) => void;
		class?: string;
	}

	let {
		filters,
		categoryCounts,
		tagGroups,
		standaloneTags,
		onchange,
		class: className
	}: Props = $props();

	let optimisticInStock = $state<boolean | undefined>(undefined);
	const inStockChecked = $derived(optimisticInStock ?? filters.inStock);

	const expandedGroups = $state<Record<string, boolean>>({});

	$effect(() => {
		void filters.inStock;
		optimisticInStock = undefined;
	});

	function isGroupExpanded(groupKey: string, group: TagGroup): boolean {
		if (expandedGroups[groupKey] !== undefined) {
			return expandedGroups[groupKey];
		}

		return filters.tag === groupKey || group.children.some((child) => child.key === filters.tag);
	}

	const categories: { value: BrowseCategory; label: string; countKey: keyof CategoryCounts }[] = [
		{ value: 'all', label: 'all', countKey: 'all' },
		{ value: 'products', label: 'products', countKey: 'products' },
		{ value: 'spares', label: 'spares', countKey: 'spares' },
		{ value: 'flea_market', label: 'flea_market', countKey: 'flea_market' }
	];

	const hasCraftFilters = $derived(tagGroups.length > 0 || standaloneTags.length > 0);

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

	function toggleGroupExpanded(groupKey: string, group: TagGroup) {
		expandedGroups[groupKey] = !isGroupExpanded(groupKey, group);
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
							onchange={() => onchange?.({ filter: category.value, page: 1 })} />
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
				class="font-mono" />
			<span class="font-mono text-xs text-muted-foreground">—</span>
			<ScInput
				type="number"
				min={0}
				placeholder="max"
				size="sm"
				value={filters.maxPrice != null ? String(filters.maxPrice) : ''}
				onchange={handleMaxPriceChange}
				class="font-mono" />
		</div>
	</section>

	{#if hasCraftFilters}
		<section class="flex flex-col gap-3">
			<p class="font-mono text-xs text-muted-foreground">// craft</p>

			<ul class="flex flex-col gap-1">
				{#each tagGroups as group (group.key)}
					<li class="flex flex-col">
						<div class="flex items-center gap-1">
							{#if group.children.length > 0}
								<button
									type="button"
									class="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									aria-expanded={isGroupExpanded(group.key, group)}
									aria-label="{isGroupExpanded(group.key, group)
										? 'Collapse'
										: 'Expand'} {group.label}"
									onclick={() => toggleGroupExpanded(group.key, group)}>
									<ChevronDown
										class={cn(
											'size-3.5 transition-transform duration-200',
											isGroupExpanded(group.key, group) ? 'rotate-0' : '-rotate-90'
										)}
										aria-hidden="true" />
								</button>
							{:else}
								<span class="size-6 shrink-0" aria-hidden="true"></span>
							{/if}

							<label
								class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 font-mono text-sm text-foreground">
								<input
									type="checkbox"
									class="size-3.5 rounded border-border accent-black"
									checked={filters.tag === group.key}
									onchange={() => toggleTag(group.key)} />
								<span class="flex-1 truncate">{group.label}</span>
								<span class="text-muted-foreground">{group.count}</span>
							</label>
						</div>

						{#if group.children.length > 0 && isGroupExpanded(group.key, group)}
							<ul class="ml-7 flex flex-col gap-1 border-l border-border pl-3">
								{#each group.children as child (child.key)}
									<li>
										<label
											class="flex cursor-pointer items-center gap-2 py-1 font-mono text-sm text-foreground">
											<input
												type="checkbox"
												class="size-3.5 rounded border-border accent-black"
												checked={filters.tag === child.key}
												onchange={() => toggleTag(child.key)} />
											<span class="flex-1 truncate">{child.label}</span>
											<span class="text-muted-foreground">{child.count}</span>
										</label>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}

				{#each standaloneTags as tag (tag.key)}
					<li>
						<label
							class="flex cursor-pointer items-center gap-2 py-1 pl-7 font-mono text-sm text-foreground">
							<input
								type="checkbox"
								class="size-3.5 rounded border-border accent-black"
								checked={filters.tag === tag.key}
								onchange={() => toggleTag(tag.key)} />
							<span class="flex-1 truncate">{tag.label}</span>
							<span class="text-muted-foreground">{tag.count}</span>
						</label>
					</li>
				{/each}
			</ul>
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
				)}>
				<span
					aria-hidden="true"
					class={cn(
						'absolute left-0.5 top-0.5 size-5 rounded-full bg-primary-foreground shadow-sm transition-transform duration-200 ease-out',
						inStockChecked ? 'translate-x-5' : 'translate-x-0'
					)}></span>
			</button>
		</label>
	</section>
</aside>
