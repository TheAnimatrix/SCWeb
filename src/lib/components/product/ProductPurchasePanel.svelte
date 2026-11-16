<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import { resolve } from '$app/paths';

	import { TagBadge, MetaChip, ScButton, Skeleton } from '$lib/components/sc';
	import { cn } from '$lib/utils';
	import { buildProductTags, tagDisplayLabel } from '$lib/utils/productTypeTag';
	import { formatInr } from '$lib/utils/format';
	import { getPurchasableLimit, isOnDemand, isOutOfStock } from '$lib/utils/stock';
	import { stripMarkup } from '$lib/seo/product';
	import type { Product } from '$lib/types/product';
	import InterestPanel, { type InterestState } from './InterestPanel.svelte';

	interface VariantOption {
		id: string;
		label: string;
		href: string;
	}

	interface Props {
		product: Product;
		/** Formatted maker name and where it links (storefront when live, otherwise a search). */
		makerName?: string | null;
		makerHref?: string | null;
		cartQty?: number;
		addToCartSuccess?: boolean | null;
		addToCartMsg?: string;
		/** Quantity that was added, for the success message. */
		addedQty?: number;
		variants?: VariantOption[];
		variantsLoading?: boolean;
		isRefreshing?: boolean;
		isAdding?: boolean;
		onIncrement?: () => void;
		onDecrement?: () => void;
		onAddToCart?: () => void;
		onVariantNavigate?: (href: string) => void;
		/** Set for an interest-check listing; shared with the page's sticky bar. */
		interestState?: InterestState | null;
		/** The viewer is still on the list of a launched or closed interest check. */
		stillOnEndedList?: boolean;
		class?: string;
	}

	let {
		product,
		makerName = null,
		makerHref = null,
		cartQty = $bindable(1),
		addToCartSuccess = null,
		addToCartMsg = '',
		addedQty = 1,
		variants = [],
		variantsLoading = false,
		isRefreshing = false,
		isAdding = false,
		onIncrement,
		onDecrement,
		onAddToCart,
		onVariantNavigate,
		interestState = null,
		stillOnEndedList = false,
		class: className
	}: Props = $props();

	const SUPPORT_EMAIL = 'support@selfcrafted.in';
	const SHORT_DESCRIPTION_MAX = 220;

	const interestStatus = $derived(product.interest?.status ?? null);
	// Open: collecting interest, nothing to buy yet. Closed: never produced.
	const interestOpen = $derived(interestStatus === 'open' && interestState !== null);
	const interestClosed = $derived(interestStatus === 'closed');
	const interestLaunched = $derived(interestStatus === 'launched');
	const unavailable = $derived(isOutOfStock(product.stock));
	const onDemand = $derived(isOnDemand(product.stock));
	const isLowStock = $derived(!unavailable && !onDemand && product.stock.count <= 5);
	const purchasableLimit = $derived(getPurchasableLimit(product.stock));
	const displayTags = $derived(buildProductTags(product.type, product.tags));
	// The API only sends a rating when the product has at least one review.
	const rating = $derived(
		product.rating && product.rating.count > 0 && product.rating.rating > 0 ? product.rating : null
	);
	const hasOldPrice = $derived(product.price.old > product.price.new);

	/**
	 * Plain-text summary of the maker's description. Markup is stripped before
	 * truncating so a cut never lands inside a tag or shows raw "##".
	 * Null when the description lives at a URL (it renders in the Description tab).
	 */
	const shortDescription = $derived.by((): string | null => {
		const docEntry = product.documentation?.at(0);
		const doc = docEntry?.data?.trim() ?? '';
		if (docEntry?.isMDUrl || /^https?:\/\//i.test(doc)) return null;

		// Lead with the first paragraph only. Running on into the next heading or list turns the
		// panel into a wall of text and repeats what the Description tab already shows.
		const firstBlock =
			doc
				.split(/<\/p>|<\/h[1-6]>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n/i)
				.map((block) => stripMarkup(block))
				.find((block) => block.length > 0) ?? '';
		const plain = firstBlock || stripMarkup(doc);
		if (!plain) return '';
		return plain.length > SHORT_DESCRIPTION_MAX
			? `${plain.slice(0, SHORT_DESCRIPTION_MAX - 1).trimEnd()}…`
			: plain;
	});

	function handleVariantChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		const selected = variants.find((variant) => variant.id === target.value);
		if (selected && selected.id !== product.id) {
			onVariantNavigate?.(selected.href);
		}
	}
</script>

<div
	class={cn('min-w-0 space-y-5 rounded-lg border border-border bg-card p-5 md:p-6', className)}
	aria-busy={isRefreshing}>
	{#if isRefreshing}
		<div class="space-y-5" aria-hidden="true">
			<div class="space-y-3">
				<Skeleton class="h-8 w-4/5 rounded-sm" />
				<Skeleton class="h-4 w-1/3 rounded-sm" />
				<div class="flex flex-wrap gap-2">
					<Skeleton class="h-6 w-16 rounded-full" />
					<Skeleton class="h-6 w-20 rounded-full" />
				</div>
				<div class="flex flex-wrap gap-2">
					<Skeleton class="h-6 w-24 rounded-full" />
					<Skeleton class="h-6 w-28 rounded-full" />
				</div>
			</div>
			<Skeleton class="h-16 w-full rounded-sm" />
			{#if variants.length > 1}
				<div class="space-y-2">
					<Skeleton class="h-4 w-16 rounded-sm" />
					<Skeleton class="h-10 w-full rounded-md" />
				</div>
			{/if}
			<Skeleton class="h-9 w-32 rounded-sm" />
			<div class="flex gap-2">
				<Skeleton class="h-10 w-28 rounded-md" />
				<Skeleton class="h-10 flex-1 rounded-md" />
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<h1 class="break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
				{product.name}
			</h1>

			{#if makerName}
				<p class="text-sm text-muted-foreground">
					by
					{#if makerHref}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- storefront path or a search URL built by the page -->
						<a
							href={makerHref}
							class="text-foreground/80 transition-colors hover:text-foreground hover:underline">
							{makerName}
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<span class="text-foreground/80">{makerName}</span>
					{/if}
				</p>
			{/if}

			<div class="flex flex-wrap items-center gap-2">
				{#each displayTags as tag (tag.label)}
					<TagBadge label={tagDisplayLabel(tag.label)} emphasized={tag.emphasized} />
				{/each}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				{#if rating}
					<MetaChip>
						<Icon icon={F.star} class="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
						<span class="sr-only">Rated</span>
						{rating.rating}
						<span class="text-muted-foreground">
							({rating.count} review{rating.count === 1 ? '' : 's'})
						</span>
					</MetaChip>
				{/if}

				{#if interestOpen}
					<MetaChip>Interest check</MetaChip>
				{:else if unavailable}
					<MetaChip tone="destructive">Out of stock</MetaChip>
				{:else if onDemand}
					<MetaChip class="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
						Made to order
					</MetaChip>
				{:else if isLowStock}
					<MetaChip>Only {product.stock.count} left</MetaChip>
				{:else}
					<MetaChip tone="muted">{product.stock.count} in stock</MetaChip>
				{/if}

				{#if product.guarantee}
					<MetaChip>{product.guarantee}</MetaChip>
				{/if}
			</div>
		</div>

		{#if shortDescription !== null}
			<p class="break-words text-sm leading-relaxed text-muted-foreground">
				{shortDescription || "The maker hasn't added a description yet."}
			</p>
		{/if}

		{#if variantsLoading}
			<div class="space-y-2" aria-hidden="true">
				<Skeleton class="h-4 w-16 rounded-sm" />
				<Skeleton class="h-10 w-full rounded-md" />
			</div>
		{:else if variants.length > 1}
			<div class="space-y-2">
				<label for="variant-select" class="text-sm font-medium text-foreground">Variant</label>
				<select
					id="variant-select"
					value={product.id}
					disabled={isRefreshing}
					onchange={handleVariantChange}
					class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none disabled:cursor-wait disabled:opacity-60">
					{#each variants as variant (variant.id)}
						<option value={variant.id}>{variant.label}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if interestOpen && interestState}
			<InterestPanel
				{interestState}
				price={product.price.new}
				oldPrice={hasOldPrice ? product.price.old : null} />
		{:else}
			<div class="space-y-1">
				{#if hasOldPrice}
					<p class="text-sm text-muted-foreground line-through">
						<span class="sr-only">Was </span>{formatInr(product.price.old)}
					</p>
				{/if}
				<p class="text-3xl font-semibold tracking-tight text-foreground">
					{formatInr(product.price.new)}
				</p>
			</div>

			{#if interestLaunched && product.interest}
				<p class="text-sm text-muted-foreground">
					Launched after {product.interest.interestedCount} people showed interest.
				</p>
			{/if}

			{#if stillOnEndedList && (interestLaunched || interestClosed)}
				<p class="text-sm">
					<a
						href={resolve('/user/profile/interest')}
						class="text-muted-foreground underline underline-offset-2 hover:text-foreground"
						>Manage this in your account</a>
				</p>
			{/if}

			{#if interestClosed}
				<p class="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
					The maker has decided not to produce this. Nobody was charged.
				</p>
			{:else}
				<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
					<div
						class="flex w-fit items-center rounded-md border border-border bg-card"
						role="group"
						aria-label="Quantity">
						<button
							type="button"
							class="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
							disabled={unavailable || cartQty <= 1}
							onclick={onDecrement}
							aria-label="Decrease quantity">
							<Icon icon={F.subtract} class="h-4 w-4" />
						</button>
						<span
							class="min-w-10 border-x border-border px-3 text-center text-sm tabular-nums"
							aria-live="polite">
							{cartQty}
						</span>
						<button
							type="button"
							class="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
							disabled={unavailable || cartQty >= purchasableLimit}
							onclick={onIncrement}
							aria-label="Increase quantity">
							<Icon icon={F.add} class="h-4 w-4" />
						</button>
					</div>

					<ScButton
						class="min-h-11 min-w-0 flex-1 whitespace-normal text-sm disabled:pointer-events-none disabled:opacity-50"
						disabled={unavailable || isAdding}
						onclick={onAddToCart}
						arrow={!unavailable}>
						{unavailable ? 'Out of stock' : isAdding ? 'Adding…' : 'Add to cart'}
					</ScButton>
				</div>

				<div role="status" aria-live="polite">
					{#if addToCartSuccess === true}
						<div
							class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
							<span>Added {addedQty} to your cart.</span>
							<a
								href={resolve('/cart')}
								class="font-medium underline underline-offset-2 hover:decoration-2">
								View cart
							</a>
						</div>
					{:else if addToCartSuccess === false}
						<div
							class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
							{addToCartMsg}
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		<ul class="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
			{#if !interestOpen && !interestClosed}
				<!-- Delivery lines only where the listing can be bought today. -->
				<li class="flex items-start gap-2">
					<Icon icon={F.truck} class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<span>Flat ₹99 delivery anywhere in India</span>
				</li>
				<li class="flex items-start gap-2">
					<Icon icon={F.box} class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<span>Packed and shipped by Selfcrafted in 3 to 14 days</span>
				</li>
			{/if}
			<li class="flex items-start gap-2">
				<Icon icon={F.mail} class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span>
					Questions?
					<a
						href="mailto:{SUPPORT_EMAIL}"
						class="text-foreground underline underline-offset-2 hover:decoration-2">
						{SUPPORT_EMAIL}
					</a>
				</span>
			</li>
		</ul>
	{/if}
</div>
