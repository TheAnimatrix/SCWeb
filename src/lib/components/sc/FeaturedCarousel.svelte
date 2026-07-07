<script lang="ts">
	import type { Product } from '$lib/types/product';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PlaceholderImage from './PlaceholderImage.svelte';

	interface Props {
		products: Product[];
		productHref: (product: Product) => string;
		interval?: number;
	}

	let { products, productHref, interval = 5000 }: Props = $props();

	let activeIndex = $state(0);
	let paused = $state(false);

	const hasMultiple = $derived(products.length > 1);
	const activeProduct = $derived(products[activeIndex]);

	function makerName(product: Product) {
		return product.author ?? product.users?.username ?? 'unknown';
	}

	function formatPrice(product: Product) {
		return product.price.new.toLocaleString('en-IN');
	}

	function formatOldPrice(product: Product) {
		return product.price.old > 0 ? product.price.old.toLocaleString('en-IN') : null;
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
		products;
		activeIndex = 0;
	});

	$effect(() => {
		if (!hasMultiple || interval <= 0 || paused) return;

		const count = products.length;
		const timer = setInterval(() => {
			activeIndex = (activeIndex + 1) % count;
		}, interval);

		return () => clearInterval(timer);
	});
</script>

{#if activeProduct}
	<div class="relative isolate">
	<div
		class="glow-ring pointer-events-none absolute -inset-0.5 -z-10 rounded-lg opacity-40 blur-md"
		aria-hidden="true"
	></div>
	<div
		class="overflow-hidden rounded-lg border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		role="region"
		aria-roledescription="carousel"
		aria-label="Featured crafts"
		tabindex="0"
		onkeydown={handleKeydown}
		onmouseenter={() => (paused = true)}
		onmouseleave={() => (paused = false)}
		onfocusin={() => (paused = true)}
		onfocusout={(event) => {
			if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
				paused = false;
			}
		}}
	>
		<div
			class="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground"
		>
			<span class="glow-text">Featured</span>

			{#if hasMultiple}
				<div class="flex items-center gap-1">
					<span class="mr-2 font-mono normal-case tracking-normal">
						{activeIndex + 1} / {products.length}
					</span>
					<button
						type="button"
						class="inline-flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
						aria-label="Previous featured craft"
						onclick={goPrev}
					>
						<ChevronLeft class="size-4" />
					</button>
					<button
						type="button"
						class="inline-flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
						aria-label="Next featured craft"
						onclick={goNext}
					>
						<ChevronRight class="size-4" />
					</button>
				</div>
			{/if}
		</div>

		<div class="overflow-hidden">
			<div
				class="flex transition-transform duration-300 ease-out"
				style:transform="translateX(-{activeIndex * 100}%)"
			>
				{#each products as product (product.id)}
					<a
						href={productHref(product)}
						class="group block w-full shrink-0 transition-colors hover:border-foreground/30"
						aria-hidden={product.id !== activeProduct.id}
						tabindex={product.id === activeProduct.id ? 0 : -1}
					>
						<div class="grid grid-cols-[minmax(0,96px)_1fr] sm:grid-cols-[minmax(0,160px)_1fr]">
							<div class="aspect-square overflow-hidden sm:aspect-auto sm:min-h-full">
								<PlaceholderImage
									src={product.images?.[0]?.url ?? null}
									alt={product.name}
									class="transition-transform duration-500 group-hover:scale-105"
								/>
							</div>

							<div class="flex min-w-0 flex-col justify-between gap-3 p-4 sm:gap-4 sm:p-6">
								<div class="space-y-2 sm:space-y-3">
									<h2 class="text-base font-medium leading-snug text-foreground sm:text-xl">
										{product.name}
									</h2>

									<dl class="space-y-1 font-mono text-xs sm:space-y-1.5 sm:text-sm">
										<div class="flex gap-2">
											<dt class="shrink-0 text-muted-foreground">maker:</dt>
											<dd class="truncate text-foreground">@{makerName(product)}</dd>
										</div>
										<div class="flex gap-2">
											<dt class="shrink-0 text-muted-foreground">stock:</dt>
											<dd class="text-foreground">{product.stock.count} units</dd>
										</div>
										{#if product.rating}
											<div class="flex gap-2">
												<dt class="shrink-0 text-muted-foreground">rating:</dt>
												<dd class="text-foreground">
													{product.rating.rating} / {product.rating.count} reviews
												</dd>
											</div>
										{/if}
									</dl>
								</div>

								<div class="text-right">
									{#if formatOldPrice(product)}
										<p class="font-mono text-sm text-muted-foreground line-through">
											₹{formatOldPrice(product)}
										</p>
									{/if}
									<p class="font-mono text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
										₹{formatPrice(product)}
									</p>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>

		{#if hasMultiple}
			<div class="flex justify-center gap-1.5 border-t border-border px-4 py-3">
				{#each products as product, index (product.id)}
					<button
						type="button"
						class="h-1.5 rounded-full transition-all {index === activeIndex
							? 'w-5 bg-foreground'
							: 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'}"
						aria-label="Go to featured craft {index + 1}"
						aria-current={index === activeIndex ? 'true' : undefined}
						onclick={() => goTo(index)}
					></button>
				{/each}
			</div>
		{/if}
	</div>
	<div
		class="glow-ring glow-border pointer-events-none absolute inset-0 rounded-lg opacity-80"
		aria-hidden="true"
	></div>
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

	@keyframes glow-spin {
		to {
			--glow-angle: 500deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.glow-ring {
			animation: none;
		}
	}
</style>
