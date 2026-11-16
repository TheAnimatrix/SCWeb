<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import type { Product } from '$lib/types/product';
	import { productUserRef } from '$lib/types/product';
	import { getTierIcon, getTierStyle, getTierTextClass } from '$lib/types/tiers';
	import { cn } from '$lib/utils';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';
	import { formatInr } from '$lib/utils/format';
	import { isOnDemand, isOpenInterest, isOutOfStock } from '$lib/utils/stock';
	import PlaceholderImage from './PlaceholderImage.svelte';

	interface Props {
		products: Product[];
		productHref: (product: Product) => string;
		interval?: number;
		/** Header label. "Featured" for curated picks, "Newest" for the fallback. */
		label?: string;
	}

	let { products, productHref, interval = 5000, label = 'Featured' }: Props = $props();

	let activeIndex = $state(0);
	let paused = $state(false);
	let prefersReducedMotion = $state(false);
	/** Autoplay only on wide screens; stops for good once the buyer touches the carousel. */
	let isWideScreen = $state(false);
	let touched = $state(false);

	const hasMultiple = $derived(products.length > 1);
	const autoPlayEnabled = $derived(
		hasMultiple && interval > 0 && !paused && !prefersReducedMotion && isWideScreen && !touched
	);

	const SWIPE_THRESHOLD_PX = 40;
	let swipeStartX: number | null = null;
	let swipeStartY = 0;
	let swiped = false;

	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType === 'mouse') return;
		touched = true;
		swipeStartX = event.clientX;
		swipeStartY = event.clientY;
		swiped = false;
	}

	function handlePointerUp(event: PointerEvent) {
		if (swipeStartX === null) return;
		const dx = event.clientX - swipeStartX;
		const dy = event.clientY - swipeStartY;
		swipeStartX = null;
		if (!hasMultiple || Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
		swiped = true;
		goTo(activeIndex + (dx < 0 ? 1 : -1));
	}

	/** A swipe must not also open the product. */
	function handleSlideClick(event: MouseEvent) {
		if (swiped) {
			event.preventDefault();
			swiped = false;
		}
	}

	function stockLabel(product: Product): string | null {
		if (isOpenInterest(product) && product.interest) {
			return `${product.interest.interestedCount} of ${product.interest.targetCount} interested`;
		}
		if (isOnDemand(product.stock)) return 'Made to order';
		if (isOutOfStock(product.stock)) return 'Out of stock';
		return `${product.stock.count} in stock`;
	}
	const activeProduct = $derived(products[activeIndex]);

	function makerName(product: Product) {
		return product.author ?? productUserRef(product.users)?.username ?? 'unknown';
	}

	function makerDisplayName(product: Product) {
		return formatUsernameDisplay(makerName(product));
	}

	function makerTier(product: Product) {
		return productUserRef(product.users)?.tier ?? 'Bee';
	}

	function showRating(product: Product) {
		const rating = product.rating;
		return rating != null && rating.rating > 0 && rating.count > 0;
	}

	function formatPrice(product: Product) {
		return formatInr(product.price.new);
	}

	function formatOldPrice(product: Product) {
		return product.price.old > product.price.new ? formatInr(product.price.old) : null;
	}

	function goTo(index: number) {
		if (products.length === 0) return;
		activeIndex = ((index % products.length) + products.length) % products.length;
	}

	function goPrev(event: MouseEvent) {
		event.preventDefault();
		goTo(activeIndex - 1);
	}

	function goNext(event?: MouseEvent) {
		event?.preventDefault();
		goTo(activeIndex + 1);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!hasMultiple) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			goTo(activeIndex - 1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			goTo(activeIndex + 1);
		}
	}

	$effect(() => {
		void products;
		activeIndex = 0;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;

		const wide = window.matchMedia('(min-width: 768px)');
		isWideScreen = wide.matches;
		const onWideChange = (event: MediaQueryListEvent) => {
			isWideScreen = event.matches;
		};
		wide.addEventListener('change', onWideChange);
		return () => wide.removeEventListener('change', onWideChange);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReducedMotion = media.matches;

		const onChange = (event: MediaQueryListEvent) => {
			prefersReducedMotion = event.matches;
		};

		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	});

	$effect(() => {
		if (!autoPlayEnabled) return;

		const count = products.length;
		let index = activeIndex;

		const timer = setInterval(() => {
			index = (index + 1) % count;
			activeIndex = index;
		}, interval);

		return () => clearInterval(timer);
	});
</script>

{#if activeProduct}
	<div class="relative isolate">
		<div
			class="glow-ring pointer-events-none absolute -inset-0.5 -z-10 rounded-lg opacity-40 blur-md"
			aria-hidden="true">
		</div>
		<div
			class="@container overflow-hidden rounded-lg border border-border bg-card"
			role="region"
			aria-roledescription="carousel"
			aria-label="Featured listings">
			<div
				class="border-b border-border bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
				<span class="glow-text">{label}</span>
			</div>

			<div
				class="overflow-hidden"
				role="group"
				aria-label="Slides"
				style:touch-action="pan-y"
				onpointerdown={handlePointerDown}
				onpointerup={handlePointerUp}
				onpointercancel={() => (swipeStartX = null)}>
				<div
					class="flex transition-transform duration-300 ease-out"
					style:transform="translateX(-{activeIndex * 100}%)">
					{#each products as product (product.id)}
						{@const tier = makerTier(product)}
						{@const tierIcon = getTierIcon(tier)}
						{@const tierStyle = getTierStyle(tier)}
						{@const tierTextClass = getTierTextClass(tier)}
						<a
							href={productHref(product)}
							class="group block w-full shrink-0 transition-colors hover:border-foreground/30"
							aria-hidden={product.id !== activeProduct.id}
							tabindex={product.id === activeProduct.id ? 0 : -1}
							onmouseenter={() => (paused = true)}
							onmouseleave={() => (paused = false)}
							onfocus={() => (paused = true)}
							onblur={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
									paused = false;
								}
							}}
							onkeydown={handleKeydown}
							onclick={handleSlideClick}>
							<div
								class="grid grid-cols-[minmax(0,36%)_1fr] @min-[400px]:grid-cols-[minmax(0,42%)_1fr] @min-[520px]:grid-cols-[minmax(0,200px)_1fr] @min-[640px]:grid-cols-[minmax(0,240px)_1fr]">
								<div class="aspect-[4/5] overflow-hidden @min-[520px]:min-h-full">
									<PlaceholderImage
										src={product.images?.[0]?.url ?? null}
										alt={product.name}
										class="transition-transform duration-500 group-hover:scale-105" />
								</div>

								<div
									class="flex min-w-0 flex-col justify-between gap-3 p-4 @min-[520px]:gap-4 @min-[520px]:p-6">
									<div class="space-y-2 @min-[520px]:space-y-3">
										<h2
											class="text-base font-medium leading-tight text-foreground @min-[520px]:text-xl">
											{product.name}
										</h2>

										<div class="space-y-2 text-sm">
											<div class="flex min-w-0 items-center gap-1.5">
												{#if tierIcon}
													<span
														class="inline-flex size-4 shrink-0"
														style:filter={tierStyle.iconFilter ?? undefined}
														aria-hidden="true">
														<Icon icon={tierIcon} class="size-full" />
													</span>
												{/if}
												<span class={cn('truncate font-medium', tierTextClass)}>
													{makerDisplayName(product)}
												</span>
											</div>

											{#if stockLabel(product)}
												<p class="flex items-center gap-1.5 text-muted-foreground">
													<Icon icon={F.box} class="size-3.5 shrink-0" aria-hidden="true" />
													{stockLabel(product)}
												</p>
											{/if}

											{#if showRating(product)}
												<p class="flex items-center gap-1.5 text-muted-foreground">
													<Icon
														icon={F.star}
														class="size-3.5 shrink-0 fill-amber-400 text-amber-400"
														aria-hidden="true" />
													<span>{product.rating?.rating}</span>
													<span class="text-muted-foreground/80">
														({product.rating?.count} review{product.rating?.count === 1 ? '' : 's'})
													</span>
												</p>
											{/if}
										</div>
									</div>

									<div class="text-right">
										{#if formatOldPrice(product)}
											<p class="text-sm font-medium text-muted-foreground line-through">
												<span class="sr-only">Was </span>{formatOldPrice(product)}
											</p>
										{/if}
										<p
											class="text-xl font-bold tracking-tight text-foreground @min-[520px]:text-3xl">
											{formatPrice(product)}
										</p>
									</div>
								</div>
							</div>
						</a>
					{/each}
				</div>
			</div>

			{#if hasMultiple}
				<div class="flex items-center justify-center gap-2 border-t border-border px-4 py-1">
					<button
						type="button"
						class="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
						aria-label="Previous featured craft"
						onmouseenter={() => (paused = true)}
						onmouseleave={() => (paused = false)}
						onfocus={() => (paused = true)}
						onblur={() => (paused = false)}
						onkeydown={handleKeydown}
						onclick={goPrev}>
						<Icon icon={F.chevronLeft} class="size-4" />
					</button>

					<div class="flex items-center">
						{#each products as product, index (product.id)}
							<button
								type="button"
								class="group/dot inline-flex h-11 min-w-6 items-center justify-center px-1"
								aria-label="Go to featured craft {index + 1}"
								aria-current={index === activeIndex ? 'true' : undefined}
								onmouseenter={() => (paused = true)}
								onmouseleave={() => (paused = false)}
								onfocus={() => (paused = true)}
								onblur={() => (paused = false)}
								onkeydown={handleKeydown}
								onclick={() => goTo(index)}>
								<span
									class="block h-1.5 rounded-full transition-all {index === activeIndex
										? 'w-5 bg-foreground'
										: 'w-1.5 bg-muted-foreground/40 group-hover/dot:bg-muted-foreground/70'}"
									aria-hidden="true"></span>
							</button>
						{/each}
					</div>

					<button
						type="button"
						class="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
						aria-label="Next featured craft"
						onmouseenter={() => (paused = true)}
						onmouseleave={() => (paused = false)}
						onfocus={() => (paused = true)}
						onblur={() => (paused = false)}
						onkeydown={handleKeydown}
						onclick={goNext}>
						<Icon icon={F.chevronRight} class="size-4" />
					</button>
				</div>
			{/if}
		</div>
		<div
			class="glow-ring glow-border pointer-events-none absolute inset-0 rounded-lg opacity-80"
			aria-hidden="true">
		</div>
	</div>
{/if}

<style>
	@property --glow-angle {
		syntax: '<angle>';
		inherits: false;
		initial-value: 140deg;
	}

	.glow-ring {
		/* monochrome base (--foreground on dark, cyan on light), broken up by rainbow streaks */
		--glow-color: var(--foreground);
		background: conic-gradient(
			from var(--glow-angle),
			hsl(var(--glow-color) / 0.7) 0deg,
			hsl(var(--glow-color) / 0.1) 44deg,
			#fb923c 58deg,
			#fb923c 70deg,
			hsl(var(--glow-color) / 0.1) 84deg,
			hsl(var(--glow-color) / 0.45) 126deg,
			hsl(var(--glow-color) / 0.08) 164deg,
			#d946ef 177deg,
			#d946ef 190deg,
			hsl(var(--glow-color) / 0.08) 204deg,
			hsl(var(--glow-color) / 0.55) 246deg,
			hsl(var(--glow-color) / 0.1) 282deg,
			#3b82f6 295deg,
			#3b82f6 308deg,
			hsl(var(--glow-color) / 0.1) 322deg,
			hsl(var(--glow-color) / 0.7) 360deg
		);
		animation: glow-spin 10s linear infinite;
	}

	:global(.light) .glow-ring {
		--glow-color: var(--accent-dark);
	}

	/* paints only the 1px border ring: padding defines the ring width,
	   the two masks xor away everything inside it */
	.glow-border {
		padding: 1px;
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: exclude;
	}

	/* clips the same revolving gradient to the heading text; the gradient center is
	   pushed far to the bottom-right (roughly where the card's middle sits relative
	   to the heading), so the text samples the same angular slice as the border
	   nearest to it — its color changes as each streak sweeps past the top-left */
	.glow-text {
		background-image: conic-gradient(
			from var(--glow-angle) at 30em 15em,
			hsl(var(--foreground) / 0.7) 0deg,
			hsl(var(--foreground) / 0.1) 44deg,
			#fb923c 58deg,
			#fb923c 70deg,
			hsl(var(--foreground) / 0.1) 84deg,
			hsl(var(--foreground) / 0.45) 126deg,
			hsl(var(--foreground) / 0.08) 164deg,
			#d946ef 177deg,
			#d946ef 190deg,
			hsl(var(--foreground) / 0.08) 204deg,
			hsl(var(--foreground) / 0.55) 246deg,
			hsl(var(--foreground) / 0.1) 282deg,
			#3b82f6 295deg,
			#3b82f6 308deg,
			hsl(var(--foreground) / 0.1) 322deg,
			hsl(var(--foreground) / 0.7) 360deg
		);
		background-color: hsl(var(--muted-foreground));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: glow-spin 10s linear infinite;
	}

	@keyframes glow-spin {
		to {
			--glow-angle: 500deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.glow-ring,
		.glow-text {
			animation: none;
		}
	}
</style>
