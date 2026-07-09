<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { getContext } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { type Writable } from 'svelte/store';
	import type { CartView } from '@scweb/api/contracts';
										import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton, StockBar, PlaceholderImage } from '$lib/components/sc';
	import { setCartItem, syncCartStore, type CartG } from '$lib/client/cartApi';
	import { toastStore } from '$lib/client/toastStore';
	import { cn } from '$lib/utils';
	import { canFulfillQuantity, getPurchasableLimit, isOnDemand } from '$lib/utils/stock';

	const cart_store = getContext<Writable<CartG>>('userCartStatus');

	let {
		data
	}: {
		data: {
			cart: CartView | null;
			apiError: boolean;
		};
	} = $props();

	let cartDetails: CartView | null = $state(data.cart);
	let isUpdatingCart = $state(false);
	let highlightedRow: number | null = $state(null);
	let quantityList = $state(data.cart?.items.map((item) => item.qty.toString()) ?? []);

	const cartItems = $derived(cartDetails?.items ?? []);
	const hasItems = $derived(cartItems.length > 0);
	const cartSubtotal = $derived(cartDetails?.subtotal ?? 0);
	const deliveryFee = $derived(cartDetails?.deliveryFee ?? 0);
	const cartTotal = $derived(cartDetails?.total ?? 0);

	$effect(() => {
		if (data.cart) {
			cartDetails = data.cart;
			quantityList = data.cart.items.map((item) => item.qty.toString());
		}
	});

	function productHref(name: string, id: string): string {
		return `/${name.replaceAll(' ', '_')}/craft/item=${id}`;
	}

	function calculateTotalPrice(itemPrice: number, itemQuantity: number) {
		return itemPrice * itemQuantity;
	}

	function isStockAvailable(
		stock: { count: number; status?: string | null },
		itemQuantity: number
	) {
		return canFulfillQuantity(stock, itemQuantity);
	}

	async function updateCartQuantity(
		index: number,
		quantity: number,
		stock: { count: number; status?: string | null }
	) {
		if (isUpdatingCart) return;
		if (!cartDetails?.items) return;

		if (!isNaN(quantity) && quantity <= 0) {
			await removeItem(index);
			return;
		}

		const item = cartDetails.items[index];
		const limit = getPurchasableLimit(stock);

		if (!isNaN(quantity) && isStockAvailable(stock, quantity)) {
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
					quantityList[index] = cartDetails.items[index].qty.toString();
				}
			} catch (err) {
				console.error('Error updating cart:', err);
				if (cartDetails) {
					quantityList[index] = cartDetails.items[index].qty.toString();
				}
			} finally {
				isUpdatingCart = false;
			}
		} else {
			const message = isOnDemand(stock)
				? `Sorry! you can only order up to ${limit} units of this made-to-order item at a time.`
				: `Sorry! we only have ${stock.count} units at the moment.`;
			toastStore.show(message, 'error');
			quantityList[index] = cartDetails.items[index].qty.toString();
		}
	}

	async function updateQuantity(
		_event: Event,
		i: number,
		stock: { count: number; status?: string | null }
	) {
		const inputQuantity = parseInt(quantityList[i]);
		await updateCartQuantity(i, inputQuantity, stock);
	}

	const debounceIncrementDecrement: Map<number, ReturnType<typeof setTimeout>> = new Map();

	async function incrementDecrementQuantity(
		isIncrement: boolean,
		i: number,
		stock: { count: number; status?: string | null }
	) {
		if (!cartDetails?.items) return;
		let quantity = +(quantityList[i] ?? 0);
		if (isIncrement) quantity++;
		else quantity = quantity > 0 ? quantity - 1 : 0;

		quantityList[i] = quantity.toString();
		if (debounceIncrementDecrement.has(i)) clearTimeout(debounceIncrementDecrement.get(i));
		debounceIncrementDecrement.set(
			i,
			setTimeout(() => {
				updateCartQuantity(i, quantity, stock);
			}, 400)
		);
	}

	async function removeItem(i: number) {
		if (isUpdatingCart) return;
		if (!cartDetails?.items) return;
		isUpdatingCart = true;

		try {
			const result = await setCartItem(fetch, cartDetails.items[i].productId, 0, 'set');
			if (result.ok) {
				cartDetails = result.data.cart;
				syncCartStore(cart_store, result.data.cart);
				await invalidate('cart:change');
			} else {
				toastStore.show(result.error.message, 'error');
				quantityList[i] = cartDetails.items[i].qty.toString();
			}
		} catch (err) {
			console.error('Error removing item:', err);
			if (cartDetails) {
				quantityList[i] = cartDetails.items[i].qty.toString();
			}
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
		if (!cartDetails?.items) return;

		for (const item of cartDetails.items) {
			if (!isStockAvailable(item.stock, item.qty)) {
				const message = isOnDemand(item.stock)
					? `Sorry! you can only order up to ${getPurchasableLimit(item.stock)} units of ${item.name} at a time.`
					: `Sorry! we only have ${item.stock.count} unit${item.stock.count > 1 ? 's' : ''} of ${item.name} at the moment.`;
				toastStore.show(message, 'error');
				return;
			}
		}
		goto('/checkout');
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'cart' }]} />

		<div class="mt-6 flex flex-col gap-2 border-b border-border pb-6">
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Your cart</h1>
			<p class="text-sm text-muted-foreground">
				{#if data.apiError}
					We could not reach the cart service.
				{:else if hasItems}
					Review your items before checkout.
				{:else}
					Your cart is empty — browse crafts to get started.
				{/if}
			</p>
		</div>

		<div class="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
			<div class="flex-1 divide-y divide-border sm:space-y-4 sm:divide-y-0">
				{#if data.apiError}
					<div
						class="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
						<div class="flex items-center gap-3">
							<Icon icon={F.errorCircle} class="size-5 shrink-0 text-foreground" aria-hidden="true" />
							<p>Could not load your cart. Try refreshing the page.</p>
						</div>
						<ScButton variant="secondary" onclick={() => invalidate('cart:change')}>Retry</ScButton>
					</div>
				{:else if !hasItems}
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center">
						<div class="mb-4 rounded-full bg-muted p-4">
							<Icon icon={F.cart} class="size-8 text-muted-foreground" aria-hidden="true" />
						</div>
						<h2 class="text-lg font-medium text-foreground">Nothing here yet</h2>
						<p class="mt-2 max-w-sm text-sm text-muted-foreground">
							Explore crafts from independent makers and add something you like.
						</p>
						<div class="mt-6">
							<ScButton href="/crafts" arrow>
								<Icon icon={F.shoppingBag} class="mr-2 inline size-4" aria-hidden="true" />
								Browse crafts
							</ScButton>
						</div>
					</div>
				{:else}
					{#each cartItems as item, i (item.productId)}
						{@const inStock = isStockAvailable(item.stock, item.qty)}
						{@const purchasableLimit = getPurchasableLimit(item.stock)}
						{@const onDemand = isOnDemand(item.stock)}
						<article
							class={cn(
								'py-3 transition-colors sm:overflow-hidden sm:rounded-lg sm:border sm:border-border sm:bg-card sm:py-0',
								highlightedRow === i && 'bg-muted/40',
								!inStock && 'opacity-70'
							)}>
							<div class="flex gap-3 sm:flex-row">
								<a
									href={productHref(item.name, item.productId)}
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
												href={productHref(item.name, item.productId)}
												class="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-foreground/80 sm:text-lg">
												{item.name}
											</a>
											{#if item.author}
												<p class="mt-0.5 truncate font-mono text-[11px] text-muted-foreground sm:text-xs">
													by @{item.author}
												</p>
											{/if}
										</div>

										<p class="shrink-0 font-mono text-sm font-semibold text-foreground sm:text-lg">
											₹{calculateTotalPrice(item.unitPrice, item.qty).toLocaleString('en-IN')}
										</p>
									</div>

									<div
										class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground sm:hidden">
										{#if onDemand}
											<span class="font-mono text-amber-700 dark:text-amber-300">
												Made to order
											</span>
										{:else}
											<span class="font-mono">stock: {item.stock.count}</span>
										{/if}
										{#if item.guarantee}
											<span aria-hidden="true">·</span>
											<span class="truncate">{item.guarantee}</span>
										{/if}
									</div>

									<div class="hidden sm:block">
										{#if onDemand}
											<p class="font-mono text-xs text-amber-700 dark:text-amber-300">
												Made to order — ships after production
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
												onclick={() => incrementDecrementQuantity(false, i, item.stock)}
												class="inline-flex size-7 items-center justify-center rounded-l-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:size-8 sm:bg-card"
												aria-label="Decrease quantity"
												disabled={isUpdatingCart}>
												<Icon icon={F.subtract} class="size-3.5 sm:size-4" />
											</button>

											<input
												type="number"
												bind:value={quantityList[i]}
												min="1"
												max={purchasableLimit}
												class="h-7 w-10 border-y border-border bg-background text-center font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 sm:h-8 sm:w-12 sm:bg-card sm:text-sm"
												disabled={isUpdatingCart}
												onchange={(e) => updateQuantity(e, i, item.stock)} />

											<button
												type="button"
												onclick={() => incrementDecrementQuantity(true, i, item.stock)}
												class="inline-flex size-7 items-center justify-center rounded-r-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:size-8 sm:bg-card"
												aria-label="Increase quantity"
												disabled={isUpdatingCart}>
												<Icon icon={F.add} class="size-3.5 sm:size-4" />
											</button>
										</div>

										<button
											type="button"
											onclick={() => removeItem(i)}
											class="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 sm:gap-1.5 sm:text-sm"
											aria-label="Remove item"
											disabled={isUpdatingCart}>
											<Icon icon={F.delete} class="size-4" />
											<span class="hidden sm:inline">Remove</span>
										</button>
									</div>
								</div>
							</div>
						</article>
					{/each}
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
								<span class="font-mono text-foreground">
									₹{cartSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
								</span>
							</div>

							<div class="flex items-center justify-between border-b border-border pb-4 text-sm">
								<div>
									<span class="text-muted-foreground">Shipping</span>
									<p class="text-xs text-muted-foreground">India-wide flat rate</p>
								</div>
								<span class="font-mono text-foreground">
									₹{deliveryFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
								</span>
							</div>

							<div class="flex items-center justify-between">
								<span class="font-medium text-foreground">Total</span>
								<span class="font-mono text-xl font-semibold text-foreground">
									₹{cartTotal.toLocaleString('en-IN', {
										minimumFractionDigits: 2
									})}
								</span>
							</div>

							<button
								type="button"
								class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={checkOut}
								disabled={isUpdatingCart}>
								Proceed to checkout
								<span aria-hidden="true">→</span>
							</button>

							<div class="text-center">
								<ScButton href="/crafts" variant="ghost" class="text-sm">
									← Continue shopping
								</ScButton>
							</div>

							<div
								class="flex items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
								<span class="inline-flex items-center gap-1">
									<Icon icon={F.shieldCheck} class="size-3.5" aria-hidden="true" />
									Secure
								</span>
								<span class="inline-flex items-center gap-1">
									<Icon icon={F.lock} class="size-3.5" aria-hidden="true" />
									Encrypted
								</span>
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
