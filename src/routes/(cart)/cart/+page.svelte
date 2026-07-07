<script lang="ts">
	import { getContext } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { type Writable } from 'svelte/store';
	import type { Session, SupabaseClient } from '@supabase/supabase-js';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Receipt from '@lucide/svelte/icons/receipt';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Lock from '@lucide/svelte/icons/lock';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton, StockBar, Skeleton, PlaceholderImage } from '$lib/components/sc';
	import { changeCart, type Cart, type CartG } from '$lib/client/cart';
	import { DELIVERY_FLAT_FEE } from '$lib/constants/numbers.js';
	import { toastStore } from '$lib/client/toastStore';
	import { cn } from '$lib/utils';

	const cart_store = getContext<Writable<CartG>>('userCartStatus');

	let {
		data
	}: {
		data: {
			cart: { data: Cart; error: boolean };
			supabase_lt: SupabaseClient;
			clientId: string;
			session: Session | null;
		};
	} = $props();

	let cartDetails: Cart | undefined = $state(data.cart.data);
	let isUpdatingCart = $state(false);
	let highlightedRow: number | null = $state(null);
	let quantityList = $state(data.cart.data?.list?.map((item) => item.qty.toString()) ?? []);
	let cartSubtotal = $state(calculateCartSubtotal(data.cart.data?.list ?? []));
	let productDetailsCache: Record<string, any> = {};

	const cartItems = $derived(cartDetails?.list ?? []);
	const hasItems = $derived(cartItems.length > 0);

	$effect(() => {
		if (data.cart.data) {
			cartDetails = data.cart.data;
			quantityList = data.cart.data.list?.map((item) => item.qty.toString()) ?? [];
			cartSubtotal = calculateCartSubtotal(data.cart.data.list ?? []);
		}
	});

	function productHref(name: string, id: string): string {
		return `/${name.replaceAll(' ', '_')}/craft/item=${id}`;
	}

	async function getItemDetails(itemId: string) {
		if (productDetailsCache[itemId]) return productDetailsCache[itemId];
		const result = await data.supabase_lt.from('products').select('*').eq('id', itemId);
		if (result.data && result.data[0]) {
			productDetailsCache[itemId] = result.data[0];
			return result.data[0];
		}
		return null;
	}

	function calculateCartSubtotal(list: { price: number; qty: number }[]) {
		let total = 0;
		list.forEach((item) => {
			total += item.price * item.qty;
		});
		return total;
	}

	function calculateTotalPrice(itemPrice: number, itemQuantity: number) {
		return itemPrice * itemQuantity;
	}

	function isStockAvailable(stockCount: number, itemQuantity: number) {
		return itemQuantity <= stockCount;
	}

	async function updateCartQuantity(index: number, quantity: number, stock: number) {
		if (isUpdatingCart) return;
		isUpdatingCart = true;

		if (!isNaN(quantity) && isStockAvailable(stock, quantity)) {
			if (!cartDetails?.list) return;
			const product = { ...cartDetails.list[index] };
			product.qty = quantity;

			try {
				const success = await changeCart(
					data.supabase_lt,
					cart_store,
					product,
					stock,
					data.clientId,
					true
				);
				if (!success.error) {
					await invalidate('cart:change');
					highlightRow(index);
				} else {
					console.error('Failed to update quantity:', success.data);
				}
			} catch (err) {
				console.error('Error updating cart:', err);
			} finally {
				isUpdatingCart = false;
			}
		} else {
			toastStore.show(`Sorry! we only have ${stock} units at the moment.`, 'error');
			if (cartDetails?.list) {
				quantityList[index] = cartDetails.list[index].qty.toString();
			}
			isUpdatingCart = false;
		}
	}

	async function updateQuantity(event: Event, i: number, result: any) {
		const inputQuantity = parseInt(quantityList[i]);
		await updateCartQuantity(i, inputQuantity, result.stock.count);
	}

	const debounceIncrementDecrement: Map<number, NodeJS.Timeout> = new Map();

	async function incrementDecrementQuantity(isIncrement: boolean, i: number, result: any) {
		if (!cartDetails?.list) return;
		let quantity = +(quantityList[i] ?? 0);
		if (isIncrement) quantity++;
		else quantity = quantity > 0 ? quantity - 1 : 0;

		quantityList[i] = quantity.toString();
		if (debounceIncrementDecrement.has(i)) clearTimeout(debounceIncrementDecrement.get(i));
		debounceIncrementDecrement.set(
			i,
			setTimeout(() => {
				updateCartQuantity(i, quantity, result.stock.count);
			}, 400)
		);
	}

	async function removeItem(i: number, result: any) {
		if (isUpdatingCart) return;
		isUpdatingCart = true;
		if (!cartDetails?.list) return;
		const product = { ...cartDetails.list[i] };
		product.qty = 0;

		try {
			const success = await changeCart(
				data.supabase_lt,
				cart_store,
				product,
				result.stock.count,
				data.clientId,
				true
			);
			if (!success.error) {
				await invalidate('cart:change');
			} else {
				console.error('Failed to remove item:', success.data);
			}
		} catch (err) {
			console.error('Error removing item:', err);
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
		if (cartDetails?.list) {
			for (let i = 0; i < cartDetails.list.length; i++) {
				if (
					!isStockAvailable(
						productDetailsCache[cartDetails.list[i].product_id].stock.count,
						cartDetails.list[i].qty
					)
				) {
					const cached = productDetailsCache[cartDetails.list[i].product_id];
					toastStore.show(
						`Sorry! we only have ${cached.stock.count} unit${cached.stock.count > 1 ? 's' : ''} of ${cached.name} at the moment.`,
						'error'
					);
					return;
				}
			}
		} else {
			return;
		}
		goto('/checkout');
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'cart' }
			]}
		/>

		<div class="mt-6 flex flex-col gap-2 border-b border-border pb-6">
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Your cart</h1>
			<p class="text-sm text-muted-foreground">
				{#if hasItems}
					Review your items before checkout.
				{:else}
					Your cart is empty — browse crafts to get started.
				{/if}
			</p>
		</div>

		<div class="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
			<div class="flex-1 space-y-4">
				{#if !hasItems}
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center"
					>
						<div class="mb-4 rounded-full bg-muted p-4">
							<ShoppingCart class="size-8 text-muted-foreground" aria-hidden="true" />
						</div>
						<h2 class="text-lg font-medium text-foreground">Nothing here yet</h2>
						<p class="mt-2 max-w-sm text-sm text-muted-foreground">
							Explore crafts from independent makers and add something you like.
						</p>
						<div class="mt-6">
							<ScButton href="/crafts" arrow>
								<ShoppingBag class="mr-2 inline size-4" aria-hidden="true" />
								Browse crafts
							</ScButton>
						</div>
					</div>
				{:else}
					{#each cartItems as productItem, i (productItem.product_id)}
						{#await getItemDetails(productItem.product_id)}
							<div
								class="overflow-hidden rounded-lg border border-border bg-card"
								aria-hidden="true"
							>
								<div class="flex flex-col sm:flex-row">
									<Skeleton class="aspect-[4/3] sm:w-40 sm:shrink-0 sm:aspect-auto sm:min-h-[140px] rounded-none border-0" />
									<div class="flex flex-1 flex-col gap-3 p-5">
										<Skeleton class="h-5 w-2/3 rounded-sm" />
										<Skeleton class="h-4 w-1/3 rounded-sm" />
										<Skeleton class="mt-auto h-8 w-32 rounded-sm" />
									</div>
								</div>
							</div>
						{:then result}
							{@const inStock = isStockAvailable(result.stock.count, productItem.qty)}
							<article
								class={cn(
									'overflow-hidden rounded-lg border border-border bg-card transition-colors',
									highlightedRow === i && 'bg-muted/40',
									!inStock && 'opacity-70'
								)}
							>
								<div class="flex flex-col sm:flex-row">
									<a
										href={productHref(result.name, productItem.product_id)}
										class="relative aspect-[4/3] overflow-hidden sm:w-40 sm:shrink-0 sm:aspect-auto sm:min-h-[140px]"
									>
										<PlaceholderImage
											src={result.images[0]?.url}
											alt={result.name}
											class="transition-transform duration-300 hover:scale-105"
										/>
									</a>

									<div class="flex flex-1 flex-col gap-4 p-5">
										<div class="flex items-start justify-between gap-4">
											<div class="min-w-0 space-y-1">
												<a
													href={productHref(result.name, productItem.product_id)}
													class="text-lg font-medium leading-snug text-foreground transition-colors hover:text-foreground/80"
												>
													{result.name}
												</a>
												<p class="font-mono text-xs text-muted-foreground">
													by @{result.author}
												</p>
											</div>

											<p class="shrink-0 font-mono text-lg font-semibold text-foreground">
												₹{calculateTotalPrice(result.price.new, productItem.qty).toLocaleString('en-IN')}
											</p>
										</div>

										<StockBar current={result.stock.count} total={Math.max(result.stock.count, 10)} />

										{#if result.guarantee}
											<p class="text-xs text-muted-foreground">{result.guarantee}</p>
										{/if}

										<div
											class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
										>
											<div class="flex items-center">
												<button
													type="button"
													onclick={() => incrementDecrementQuantity(false, i, result)}
													class="inline-flex size-8 items-center justify-center rounded-l-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-50"
													aria-label="Decrease quantity"
													disabled={isUpdatingCart}
												>
													<Minus class="size-4" />
												</button>

												<input
													type="number"
													bind:value={quantityList[i]}
													min="1"
													max={result.stock.count}
													class="h-8 w-12 border-y border-border bg-card text-center font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
													disabled={isUpdatingCart}
													onchange={(e) => updateQuantity(e, i, result)}
												/>

												<button
													type="button"
													onclick={() => incrementDecrementQuantity(true, i, result)}
													class="inline-flex size-8 items-center justify-center rounded-r-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-50"
													aria-label="Increase quantity"
													disabled={isUpdatingCart}
												>
													<Plus class="size-4" />
												</button>
											</div>

											<button
												type="button"
												onclick={() => removeItem(i, result)}
												class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
												aria-label="Remove item"
												disabled={isUpdatingCart}
											>
												<Trash2 class="size-4" />
												Remove
											</button>
										</div>
									</div>
								</div>
							</article>
						{:catch}
							<div
								class="flex items-center gap-3 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground"
							>
								<AlertCircle class="size-5 shrink-0 text-foreground" aria-hidden="true" />
								<p>Could not load this item. Try refreshing the page.</p>
							</div>
						{/await}
					{/each}
				{/if}
			</div>

			{#if hasItems}
				<aside class="w-full lg:w-80 lg:shrink-0">
					<div class="sticky top-20 rounded-lg border border-border bg-card">
						<div class="flex items-center gap-2 border-b border-border px-5 py-4">
							<Receipt class="size-4 text-foreground" aria-hidden="true" />
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
									₹{DELIVERY_FLAT_FEE.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
								</span>
							</div>

							<div class="flex items-center justify-between">
								<span class="font-medium text-foreground">Total</span>
								<span class="font-mono text-xl font-semibold text-foreground">
									₹{(cartSubtotal + DELIVERY_FLAT_FEE).toLocaleString('en-IN', {
										minimumFractionDigits: 2
									})}
								</span>
							</div>

							<button
								type="button"
								class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={checkOut}
								disabled={isUpdatingCart}
							>
								Proceed to checkout
								<span aria-hidden="true">→</span>
							</button>

							<div class="text-center">
								<ScButton href="/crafts" variant="ghost" class="text-sm">
									← Continue shopping
								</ScButton>
							</div>

							<div
								class="flex items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground"
							>
								<span class="inline-flex items-center gap-1">
									<ShieldCheck class="size-3.5" aria-hidden="true" />
									Secure
								</span>
								<span class="inline-flex items-center gap-1">
									<Lock class="size-3.5" aria-hidden="true" />
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
	}
</style>
