<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { getContext } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { type Writable } from 'svelte/store';
	import type { CartView } from '@scweb/api/contracts';
	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton, StockBar, PlaceholderImage, MakerAttribution } from '$lib/components/sc';
	import { setCartItem, stockLimitMessage, syncCartStore, type CartG } from '$lib/client/cartApi';
	import { toastStore } from '$lib/client/toastStore';
	import { cn } from '$lib/utils';
	import { formatInr } from '$lib/utils/format';
	import { productPath } from '$lib/seo/product';
	import { canFulfillQuantity, getPurchasableLimit, isOnDemand } from '$lib/utils/stock';

	type Stock = { count: number; status?: string | null };

	const cart_store = getContext<Writable<CartG>>('userCartStatus');

	let {
		data
	}: {
		data: {
			cart: CartView | null;
			apiError: boolean;
		};
	} = $props();

	// Local copy so quantity edits show at once; reset whenever the load data changes.
	let cartDetails: CartView | null = $derived(data.cart);
	const quantitiesFrom = (cart: CartView | null) =>
		cart?.items.map((item) => item.qty.toString()) ?? [];
	// Typed quantities; reset from the server cart whenever the load data changes.
	let quantityList: string[] = $derived(quantitiesFrom(data.cart));

	function setQuantityText(index: number, value: string) {
		quantityList = quantityList.with(index, value);
	}

	let isUpdatingCart = $state(false);
	let isCheckingOut = $state(false);
	let highlightedRow: number | null = $state(null);
	let lastRemoved: { productId: string; name: string; qty: number } | null = $state(null);
	let undoTimer: ReturnType<typeof setTimeout> | undefined;

	const cartItems = $derived(cartDetails?.items ?? []);
	const hasItems = $derived(cartItems.length > 0);
	const cartSubtotal = $derived(cartDetails?.subtotal ?? 0);
	const deliveryFee = $derived(cartDetails?.deliveryFee ?? 0);
	const cartTotal = $derived(cartDetails?.total ?? 0);

	$effect(() => () => clearTimeout(undoTimer));

	function lineProblem(item: { name: string; qty: number; stock: Stock }): string | null {
		if (canFulfillQuantity(item.stock, item.qty)) return null;
		if (isOnDemand(item.stock)) {
			return `You can order up to ${getPurchasableLimit(item.stock)} of this made-to-order item at a time. Lower the quantity to continue.`;
		}
		return stockLimitMessage(getPurchasableLimit(item.stock), item.name);
	}

	const blockingProblem = $derived(
		cartItems.map((item) => lineProblem(item)).find((problem) => problem !== null) ?? null
	);

	function resetQuantity(index: number) {
		if (cartDetails?.items[index]) {
			setQuantityText(index, cartDetails.items[index].qty.toString());
		}
	}

	async function updateCartQuantity(index: number, quantity: number, stock: Stock) {
		if (isUpdatingCart) return;
		if (!cartDetails?.items) return;

		// Empty or non-numeric input: put the old quantity back, no message.
		if (!Number.isFinite(quantity) || quantity < 1) {
			resetQuantity(index);
			return;
		}

		const item = cartDetails.items[index];
		if (quantity === item.qty) return;

		if (!canFulfillQuantity(stock, quantity)) {
			toastStore.show(
				isOnDemand(stock)
					? `You can order up to ${getPurchasableLimit(stock)} of this made-to-order item at a time.`
					: stockLimitMessage(getPurchasableLimit(stock), item.name),
				'error'
			);
			resetQuantity(index);
			return;
		}

		isUpdatingCart = true;
		try {
			const result = await setCartItem(fetch, item.productId, quantity, 'set');
			if (result.ok) {
				cartDetails = result.data.cart;
				syncCartStore(cart_store, result.data.cart);
				await invalidate('cart:change');
				highlightRow(index);
			} else {
				toastStore.show(result.error.message, 'error');
				resetQuantity(index);
			}
		} catch (err) {
			console.error('Error updating cart:', err);
			resetQuantity(index);
		} finally {
			isUpdatingCart = false;
		}
	}

	async function updateQuantity(i: number, stock: Stock) {
		await updateCartQuantity(i, parseInt(quantityList[i] ?? '', 10), stock);
	}

	const stepTimers: Record<number, ReturnType<typeof setTimeout>> = {};

	function stepQuantity(isIncrement: boolean, i: number, stock: Stock) {
		if (!cartDetails?.items) return;
		const current = parseInt(quantityList[i] ?? '', 10) || cartDetails.items[i].qty;
		// The stepper never goes below 1; removing is its own button.
		const quantity = isIncrement ? current + 1 : Math.max(1, current - 1);

		setQuantityText(i, quantity.toString());
		clearTimeout(stepTimers[i]);
		stepTimers[i] = setTimeout(() => {
			void updateCartQuantity(i, quantity, stock);
		}, 400);
	}

	async function setLine(productId: string, qty: number) {
		const result = await setCartItem(fetch, productId, qty, 'set');
		if (result.ok) {
			cartDetails = result.data.cart;
			syncCartStore(cart_store, result.data.cart);
			await invalidate('cart:change');
		}
		return result;
	}

	async function removeItem(i: number) {
		if (isUpdatingCart) return;
		const item = cartDetails?.items[i];
		if (!item) return;
		isUpdatingCart = true;

		try {
			const result = await setLine(item.productId, 0);
			if (result.ok) {
				clearTimeout(undoTimer);
				lastRemoved = { productId: item.productId, name: item.name, qty: item.qty };
				undoTimer = setTimeout(() => (lastRemoved = null), 8000);
			} else {
				toastStore.show(result.error.message, 'error');
			}
		} catch (err) {
			console.error('Error removing item:', err);
		} finally {
			isUpdatingCart = false;
		}
	}

	async function undoRemove() {
		const removed = lastRemoved;
		if (!removed || isUpdatingCart) return;
		clearTimeout(undoTimer);
		lastRemoved = null;
		isUpdatingCart = true;
		try {
			const result = await setLine(removed.productId, removed.qty);
			if (!result.ok) toastStore.show(result.error.message, 'error');
		} finally {
			isUpdatingCart = false;
		}
	}

	function highlightRow(index: number) {
		highlightedRow = index;
		setTimeout(() => {
			highlightedRow = null;
		}, 1000);
	}

	async function checkOut() {
		if (isCheckingOut || blockingProblem) return;
		isCheckingOut = true;
		try {
			await goto(resolve('/checkout'));
		} finally {
			isCheckingOut = false;
		}
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'cart' }]} />

		<div class="mt-6 flex flex-col gap-2 border-b border-border pb-6">
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Your cart</h1>
			{#if !data.apiError}
				<p class="text-sm text-muted-foreground">
					{hasItems ? 'Review your items before checkout.' : 'Your cart is empty.'}
				</p>
			{/if}
		</div>

		{#if lastRemoved}
			<div
				class="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
				role="status">
				<span class="min-w-0 truncate">Removed {lastRemoved.name}.</span>
				<ScButton variant="ghost" class="min-h-10" onclick={undoRemove} disabled={isUpdatingCart}>
					Undo
				</ScButton>
			</div>
		{/if}

		<div class="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
			<div class="flex-1 divide-y divide-border sm:space-y-4 sm:divide-y-0">
				{#if data.apiError}
					<div
						class="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
						<div class="flex items-center gap-3">
							<Icon
								icon={F.errorCircle}
								class="size-5 shrink-0 text-foreground"
								aria-hidden="true" />
							<p>Your cart didn't load.</p>
						</div>
						<ScButton variant="secondary" onclick={() => invalidate('cart:change')}>Retry</ScButton>
					</div>
				{:else if !hasItems}
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center">
						<div class="mb-6 rounded-full bg-muted p-4">
							<Icon icon={F.cart} class="size-8 text-muted-foreground" aria-hidden="true" />
						</div>
						<ScButton href="/crafts" arrow>
							<Icon icon={F.shoppingBag} class="mr-2 inline size-4" aria-hidden="true" />
							Browse the shop
						</ScButton>
					</div>
				{:else}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- productPath builds the canonical product URL -->
					{#each cartItems as item, i (item.productId)}
						{@const problem = lineProblem(item)}
						{@const purchasableLimit = getPurchasableLimit(item.stock)}
						{@const onDemand = isOnDemand(item.stock)}
						{@const href = productPath({ id: item.productId, name: item.name })}
						{@const qtyNow = parseInt(quantityList[i] ?? '', 10) || item.qty}
						<article
							class={cn(
								'py-3 transition-colors sm:overflow-hidden sm:rounded-lg sm:border sm:border-border sm:bg-card sm:py-0',
								highlightedRow === i && 'bg-muted/40',
								problem && 'sm:border-destructive/40'
							)}>
							<div class="flex gap-3 sm:flex-row">
								<a
									{href}
									class="relative size-[4.5rem] shrink-0 overflow-hidden rounded-md sm:size-auto sm:w-40 sm:shrink-0 sm:rounded-none sm:aspect-auto sm:min-h-[140px]">
									<PlaceholderImage
										src={item.imageUrl ?? undefined}
										alt={item.name}
										class="size-full object-cover transition-transform duration-300 hover:scale-105" />
								</a>

								<div class="flex min-w-0 flex-1 flex-col gap-2 sm:gap-4 sm:p-5">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<a
												{href}
												class="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-foreground/80 sm:text-lg">
												{item.name}
											</a>
											{#if item.author}
												<MakerAttribution
													username={item.author}
													tier={item.authorTier}
													class="mt-0.5" />
											{/if}
											<p class="mt-0.5 text-xs text-muted-foreground">
												{formatInr(item.unitPrice)} each
											</p>
										</div>

										<p class="shrink-0 font-mono text-sm font-semibold text-foreground sm:text-lg">
											{formatInr(item.unitPrice * item.qty)}
										</p>
									</div>

									{#if problem}
										<p class="text-sm text-destructive" role="alert">{problem}</p>
									{/if}

									<div
										class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground sm:hidden">
										{#if onDemand}
											<span class="font-mono text-amber-700 dark:text-amber-300">
												Made to order
											</span>
										{:else}
											<span class="font-mono">In stock: {item.stock.count}</span>
										{/if}
										{#if item.guarantee}
											<span aria-hidden="true">·</span>
											<span class="truncate">{item.guarantee}</span>
										{/if}
									</div>

									<div class="hidden sm:block">
										{#if onDemand}
											<p class="font-mono text-xs text-amber-700 dark:text-amber-300">
												Made to order. Ships after it is made.
											</p>
										{:else}
											<StockBar count={item.stock.count} />
										{/if}
									</div>

									{#if item.guarantee}
										<p class="hidden text-xs text-muted-foreground sm:block">{item.guarantee}</p>
									{/if}

									<div
										class="flex items-center justify-between gap-2 sm:flex-wrap sm:justify-between sm:gap-3 sm:border-t sm:border-border sm:pt-4">
										<div class="flex items-center">
											<button
												type="button"
												onclick={() => stepQuantity(false, i, item.stock)}
												class="inline-flex size-10 items-center justify-center rounded-l-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:bg-card"
												aria-label="Decrease quantity of {item.name}"
												disabled={isUpdatingCart || qtyNow <= 1}>
												<Icon icon={F.subtract} class="size-4" />
											</button>

											<input
												type="number"
												inputmode="numeric"
												value={quantityList[i]}
												oninput={(e) => setQuantityText(i, e.currentTarget.value)}
												min="1"
												max={purchasableLimit}
												aria-label="Quantity of {item.name}"
												class="h-10 w-12 border-y border-border bg-background text-center font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 sm:bg-card"
												disabled={isUpdatingCart}
												onchange={() => updateQuantity(i, item.stock)} />

											<button
												type="button"
												onclick={() => stepQuantity(true, i, item.stock)}
												class="inline-flex size-10 items-center justify-center rounded-r-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:bg-card"
												aria-label="Increase quantity of {item.name}"
												disabled={isUpdatingCart || qtyNow >= purchasableLimit}>
												<Icon icon={F.add} class="size-4" />
											</button>
										</div>

										<button
											type="button"
											onclick={() => removeItem(i)}
											class="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
											aria-label="Remove {item.name}"
											disabled={isUpdatingCart}>
											<Icon icon={F.delete} class="size-4" aria-hidden="true" />
											<span>Remove</span>
										</button>
									</div>
								</div>
							</div>
						</article>
					{/each}
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</div>

			{#if hasItems}
				<aside class="w-full lg:w-80 lg:shrink-0">
					<div class="sticky top-20 rounded-lg border border-border bg-card">
						<div class="flex items-center gap-2 border-b border-border px-5 py-4">
							<Icon icon={F.receipt} class="size-4 text-foreground" aria-hidden="true" />
							<h2 class="text-sm font-medium text-foreground">Order summary</h2>
						</div>

						<div class="space-y-4 p-5">
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Subtotal</span>
								<span class="font-mono text-foreground">{formatInr(cartSubtotal)}</span>
							</div>

							<div class="flex items-center justify-between border-b border-border pb-4 text-sm">
								<div>
									<span class="text-muted-foreground">Delivery</span>
									<p class="text-xs text-muted-foreground">Flat rate within India</p>
								</div>
								<span class="font-mono text-foreground">{formatInr(deliveryFee)}</span>
							</div>

							<div class="flex items-center justify-between">
								<span class="font-medium text-foreground">Total</span>
								<span class="font-mono text-xl font-semibold text-foreground">
									{formatInr(cartTotal)}
								</span>
							</div>

							<p class="text-xs text-muted-foreground">Orders ship in 3 to 14 days.</p>

							<button
								type="button"
								class="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
								onclick={checkOut}
								aria-describedby={blockingProblem ? 'checkout-blocked' : undefined}
								disabled={isUpdatingCart || isCheckingOut || blockingProblem !== null}>
								{isCheckingOut ? 'Going to checkout…' : 'Proceed to checkout'}
								{#if !isCheckingOut}
									<span
										class="transition-transform duration-200 group-hover:translate-x-0.5"
										aria-hidden="true">→</span>
								{/if}
							</button>

							{#if blockingProblem}
								<p id="checkout-blocked" class="text-sm text-destructive">
									Fix the item marked above to check out.
								</p>
							{/if}

							<div class="text-center">
								<ScButton href="/crafts" variant="ghost" class="text-sm">
									← Continue shopping
								</ScButton>
							</div>

							<div
								class="space-y-1 border-t border-border pt-4 text-center text-xs text-muted-foreground">
								<p>Pay with UPI, cards or netbanking through Razorpay.</p>
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static policy anchor -->
								<a href="/policy#cancellation" class="underline underline-offset-2">
									Cancellation and refunds
								</a>
							</div>
						</div>
					</div>
				</aside>
			{/if}
		</div>
	</div>
</div>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>
