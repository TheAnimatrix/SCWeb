<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import type {
		BrowseCategory,
		BrowseFilters,
		CategoryCounts,
		TagGroup,
		TagOption
	} from '$lib/types/browse';
	import { cn } from '$lib/utils';
	import { tagDisplayLabel as formatTagDisplayLabel } from '$lib/utils/productTypeTag';
	import ScInput from './ScInput.svelte';

	interface Props {
		filters: BrowseFilters;
		/** Null when the catalog didn't load: counts are hidden rather than shown as 0. */
		categoryCounts: CategoryCounts | null;
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

	// Two sidebars can be mounted at once (desktop + mobile drawer); radio groups need distinct names.
	const uid = $props.id();

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
		{ value: 'all', label: 'All', countKey: 'all' },
		{ value: 'products', label: 'Products', countKey: 'products' },
		{ value: 'spares', label: 'Spares', countKey: 'spares' },
		{ value: 'flea_market', label: 'Flea market', countKey: 'flea_market' }
	];

	const hasCraftFilters = $derived(tagGroups.length > 0 || standaloneTags.length > 0);

	function parsePrice(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		return Number.isNaN(parsed) ? null : parsed;
	}

	// Price fields apply on "Apply" (or Enter), not on blur: on mobile, moving from
	// min to max used to fire a search before the buyer finished typing.
	let minPriceInput = $state('');
	let maxPriceInput = $state('');

	$effect.pre(() => {
		minPriceInput = filters.minPrice != null ? String(filters.minPrice) : '';
		maxPriceInput = filters.maxPrice != null ? String(filters.maxPrice) : '';
	});

	function applyPrice(event: SubmitEvent) {
		event.preventDefault();
		let minPrice = parsePrice(minPriceInput);
		let maxPrice = parsePrice(maxPriceInput);
		if (minPrice != null && minPrice < 0) minPrice = null;
		if (maxPrice != null && maxPrice < 0) maxPrice = null;
		if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
			[minPrice, maxPrice] = [maxPrice, minPrice];
		}
		onchange?.({ minPrice, maxPrice, page: 1 });
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
		<h2 id="{uid}-category" class="text-sm font-medium text-foreground">Category</h2>
		<ul class="flex flex-col" role="radiogroup" aria-labelledby="{uid}-category">
			{#each categories as category (category.value)}
				<li>
					<label class="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-foreground">
						<input
							type="radio"
							name="{uid}-category"
							class="size-4 shrink-0 accent-primary"
							checked={filters.filter === category.value}
							onchange={() => onchange?.({ filter: category.value, page: 1 })} />
						<span class="flex-1">{category.label}</span>
						{#if categoryCounts}
							<span class="tabular-nums text-muted-foreground">
								{categoryCounts[category.countKey]}
							</span>
						{/if}
					</label>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-medium text-foreground">Price</h2>
		<form class="flex flex-col gap-2" onsubmit={applyPrice}>
			<div class="flex items-end gap-2">
				<div class="min-w-0 flex-1">
					<ScInput
						id="{uid}-min-price"
						label="Min (₹)"
						labelClass="text-xs text-muted-foreground"
						type="number"
						inputmode="numeric"
						min={0}
						prefix="₹"
						placeholder="0"
						bind:value={minPriceInput}
						glow={false} />
				</div>
				<span class="pb-2.5 text-sm text-muted-foreground" aria-hidden="true">to</span>
				<div class="min-w-0 flex-1">
					<ScInput
						id="{uid}-max-price"
						label="Max (₹)"
						labelClass="text-xs text-muted-foreground"
						type="number"
						inputmode="numeric"
						min={0}
						prefix="₹"
						placeholder="Any"
						bind:value={maxPriceInput}
						glow={false} />
				</div>
			</div>
			<button
				type="submit"
				class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted">
				Apply price
			</button>
		</form>
	</section>

	{#if hasCraftFilters}
		<section class="flex flex-col gap-3">
			<h2 class="text-sm font-medium text-foreground">Craft</h2>

			<ul class="flex flex-col gap-1">
				{#each tagGroups as group (group.key)}
					<li class="flex flex-col">
						<div class="flex items-center gap-1">
							{#if group.children.length > 0}
								<button
									type="button"
									class="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									aria-expanded={isGroupExpanded(group.key, group)}
									aria-label="{isGroupExpanded(group.key, group)
										? 'Collapse'
										: 'Expand'} {group.label}"
									onclick={() => toggleGroupExpanded(group.key, group)}>
									<Icon
										icon={F.chevronDown}
										class={cn(
											'size-3.5 transition-transform duration-200',
											isGroupExpanded(group.key, group) ? 'rotate-0' : '-rotate-90'
										)}
										aria-hidden="true" />
								</button>
							{:else}
								<span class="size-8 shrink-0" aria-hidden="true"></span>
							{/if}

							<label
								class="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm text-foreground">
								<input
									type="checkbox"
									class="size-4 shrink-0 rounded border-border accent-primary"
									checked={filters.tag === group.key}
									onchange={() => toggleTag(group.key)} />
								<span class="flex-1 truncate">{formatTagDisplayLabel(group.label)}</span>
								<span class="tabular-nums text-muted-foreground">{group.count}</span>
							</label>
						</div>

						{#if group.children.length > 0 && isGroupExpanded(group.key, group)}
							<ul class="ml-9 flex flex-col border-l border-border pl-3">
								{#each group.children as child (child.key)}
									<li>
										<label
											class="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-foreground">
											<input
												type="checkbox"
												class="size-4 shrink-0 rounded border-border accent-primary"
												checked={filters.tag === child.key}
												onchange={() => toggleTag(child.key)} />
											<span class="flex-1 truncate">{formatTagDisplayLabel(child.label)}</span>
											<span class="tabular-nums text-muted-foreground">{child.count}</span>
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
							class="flex min-h-10 cursor-pointer items-center gap-3 pl-9 text-sm text-foreground">
							<input
								type="checkbox"
								class="size-4 shrink-0 rounded border-border accent-primary"
								checked={filters.tag === tag.key}
								onchange={() => toggleTag(tag.key)} />
							<span class="flex-1 truncate">{formatTagDisplayLabel(tag.label)}</span>
							<span class="tabular-nums text-muted-foreground">{tag.count}</span>
						</label>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-medium text-foreground">Availability</h2>
		<label class="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-sm">
			<span>In stock only</span>
			<button
				type="button"
				role="switch"
				aria-label="In stock only"
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
