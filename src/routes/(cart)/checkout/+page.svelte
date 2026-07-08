<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { type Writable } from 'svelte/store';
	import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
	import UserCircle from '@lucide/svelte/icons/user-circle';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Receipt from '@lucide/svelte/icons/receipt';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Lock from '@lucide/svelte/icons/lock';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Package from '@lucide/svelte/icons/package';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import { CheckoutLineSkeleton, PlaceholderImage, ScButton, Skeleton } from '$lib/components/sc';
	import { type CartG, type Cart } from '$lib/client/cart';
	import { newAddress, validateAddress, asAddressList, type Address } from '$lib/types/product';
	import { DELIVERY_FLAT_FEE } from '$lib/constants/numbers.js';
	import { toastStore } from '$lib/client/toastStore.js';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';

	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase_lt);
	}

	let validAddress: Address | undefined = $state();
	let productDetailsCache: Record<string, any> = {};
	const addresses = $derived(asAddressList(data.addresses));

	async function getProductDetails(productId: string) {
		if (productDetailsCache[productId]) return productDetailsCache[productId];

		const result = await supabase()
			.from('products')
			.select('name,images,price,author')
			.eq('id', productId);
		if (result.data?.[0]) {
			productDetailsCache[productId] = result.data[0];
			return result.data[0];
		}
		return null;
	}

	function calcSubTotal(cart: Cart | undefined) {
		let total = 0;
		cart?.list?.forEach((item) => {
			total += item.price * item.qty;
		});
		return total;
	}

	let cartData = $derived(data.cart?.error ? undefined : data.cart?.data);
	let subtotal = $derived(calcSubTotal(cartData));
	let cartItems = $derived(cartData?.list ?? []);
	let hasItems = $derived(cartItems.length > 0);

	let addressValid: boolean = $state(false);
	if (data.userExists && addresses.length > 0) {
		const firstAddress = addresses[0];
		if (validateAddress(firstAddress) == null) {
			addressValid = true;
			validAddress = firstAddress;
		} else {
			addressValid = false;
			validAddress = newAddress();
		}
	} else {
		addressValid = false;
		validAddress = newAddress();
	}

	const cart_store = getContext<Writable<CartG>>('userCartStatus');
	let isPaying = $state(false);

	function productHref(name: string, id: string): string {
		return `/${name.replaceAll(' ', '_')}/craft/item=${id}`;
	}

	async function payNow() {
		if (isPaying) return;

		if (!cartData) {
			toastStore.show('An error occurred preparing your order. Please try again.', 'error');
			return;
		}

		if (!validAddress) {
			toastStore.show('Please select or enter a valid shipping address.', 'error');
			return;
		}

		isPaying = true;
		const formData = new FormData();
		formData.append('orderId', cartData.id);
		formData.append('address', JSON.stringify(validAddress));

		try {
			const result = await fetch('/checkout/createOrder', { method: 'POST', body: formData });
			const dataResult = await result.json();

			if (!result.ok || !dataResult || dataResult.error) {
				toastStore.show(
					dataResult?.message ??
						'Failed to create payment order. Please check your details and try again.',
					'error'
				);
				isPaying = false;
				return;
			}

			const options = {
				key: PUBLIC_RAZORPAY_ID,
				amount: dataResult.amount,
				currency: 'INR',
				name: 'SelfCrafted',
				image:
					'https://pfeewicqoxkuwnbuxnoz.supabase.co/storage/v1/object/public/images/favicon.png',
				order_id: dataResult.orderId,
				handler: async function (response: {
					razorpay_order_id: string;
					razorpay_payment_id: string;
					razorpay_signature: string;
				}) {
					if (!cartData) {
						isPaying = false;
						return;
					}
					const formData2 = new FormData();
					formData2.append('payment_id_a', response.razorpay_order_id);
					formData2.append('payment_id_b', response.razorpay_payment_id);
					formData2.append('payment_signature', response.razorpay_signature);
					const patchResult = await fetch('/checkout/createOrder', {
						method: 'PATCH',
						body: formData2
					});
					if (!patchResult.ok) {
						isPaying = false;
						return;
					}
					cart_store.set({ valid: false, itemCount: 0 });
					isPaying = false;
					goto(`/summary/success/${cartData.id}/${response.razorpay_payment_id}`);
				},
				modal: {
					ondismiss: function () {
						isPaying = false;
					}
				},
				prefill: {},
				theme: {
					color: '#2084fe'
				}
			};

			const rzp1 = new Razorpay(options);
			if (!rzp1) {
				toastStore.show('Issue with payment provider. Please try again.', 'error');
				isPaying = false;
				return;
			}
			rzp1.open();
			rzp1.on('payment.failed', async function (response: unknown) {
				const failedResponse = response as {
					error?: { metadata?: { order_id?: string } };
				};
				if (!cartData) {
					isPaying = false;
					rzp1.close();
					goto('/summary/failure');
					return;
				}
				isPaying = false;
				rzp1.close();
				const orderId = failedResponse.error?.metadata?.order_id;
				if (!orderId) {
					goto('/summary/failure');
					return;
				}
				try {
					await fetch(`/summary/failure/${cartData.id}/${orderId}`, { method: 'POST' });
				} catch {
					// Still navigate so the user sees the failure page.
				}
				window.location.href = `/summary/failure/${cartData.id}/${orderId}`;
			});
		} catch (e: unknown) {
			toastStore.show(
				`An unexpected error occurred during payment: ${e instanceof Error ? e.message : 'Unknown error'}`,
				'error'
			);
			isPaying = false;
		}
	}
</script>

<svelte:head>
	<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'cart', href: '/cart' },
				{ label: 'checkout' }
			]} />

		<div class="mt-6 flex flex-col gap-2 border-b border-border pb-6">
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Checkout</h1>
			<p class="text-sm text-muted-foreground">
				Add your shipping details to complete your purchase.
			</p>
		</div>

		<div class="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
			<div class="flex-1 space-y-4">
				{#if !data.userExists}
					<div class="rounded-lg border border-border bg-card p-5">
						<div class="flex items-start gap-3">
							<div class="rounded-full bg-muted p-2">
								<UserCircle class="size-5 text-foreground" aria-hidden="true" />
							</div>
							<div class="min-w-0 flex-1">
								<h2 class="text-sm font-medium text-foreground">Account benefits</h2>
								<p class="mt-1 text-sm text-muted-foreground">
									Sign in for faster checkout, order tracking, saved addresses, and exclusive
									offers.
								</p>
								<div class="mt-4">
									<ScButton href="/user/sign" variant="secondary">
										<LogIn class="mr-2 inline size-4" aria-hidden="true" />
										Login or register
									</ScButton>
								</div>
							</div>
						</div>

						<div class="relative my-6">
							<div class="absolute inset-0 flex items-center" aria-hidden="true">
								<div class="w-full border-t border-border"></div>
							</div>
							<div class="relative flex justify-center">
								<span class="bg-card px-3 text-sm text-muted-foreground">Continue as guest</span>
							</div>
						</div>

						<AddressInputSelector
							email={data.email}
							userExists={data.userExists}
							{addresses}
							bind:address={validAddress}
							bind:addressValid />
					</div>
				{:else}
					<AddressInputSelector
						email={data.email}
						userExists={data.userExists}
						{addresses}
						bind:address={validAddress}
						bind:addressValid />
				{/if}
			</div>

			<aside class="w-full lg:w-80 lg:shrink-0">
				<div class="sticky top-20 rounded-lg border border-border bg-card">
					<div class="flex items-center gap-2 border-b border-border px-5 py-4">
						<Receipt class="size-4 text-foreground" aria-hidden="true" />
						<h2 class="text-sm font-medium text-foreground">Order summary</h2>
					</div>

					<div class="space-y-4 p-5">
						{#if hasItems}
							<div class="max-h-60 space-y-3 overflow-y-auto pr-1">
								{#each cartItems as item (item.product_id)}
									{#await getProductDetails(item.product_id)}
										<div class="border-b border-border pb-3 last:border-0 last:pb-0">
											<div class="flex items-center justify-between gap-3">
												<div class="flex min-w-0 flex-1 items-center gap-3">
													<span
														class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
														{item.qty}
													</span>
													<Skeleton class="size-10 shrink-0 rounded-md" />
													<div class="min-w-0 flex-1 space-y-1.5">
														<Skeleton class="h-4 w-3/4 max-w-[140px] rounded-sm" />
														<Skeleton class="h-3 w-1/2 max-w-[90px] rounded-sm" />
													</div>
												</div>
												<span class="shrink-0 text-sm font-medium text-foreground">
													₹{(item.price * item.qty).toLocaleString('en-IN')}
												</span>
											</div>
										</div>
									{:then product}
										<div class="border-b border-border pb-3 last:border-0 last:pb-0">
											<div class="flex items-center justify-between gap-3">
												<div class="flex min-w-0 flex-1 items-center gap-3">
													<span
														class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
														{item.qty}
													</span>
													{#if product}
														<a
															href={productHref(product.name, item.product_id)}
															class="size-10 shrink-0 overflow-hidden rounded-md">
															{#if product.images?.length}
																<PlaceholderImage
																	src={product.images[0].url}
																	alt={product.name}
																	class="size-10" />
															{:else}
																<div
																	class="flex size-10 items-center justify-center rounded-md bg-muted">
																	<Package
																		class="size-4 text-muted-foreground"
																		aria-hidden="true" />
																</div>
															{/if}
														</a>
													{:else}
														<div
															class="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
															<Package class="size-4 text-muted-foreground" aria-hidden="true" />
														</div>
													{/if}
													<div class="min-w-0">
														{#if product}
															<a
																href={productHref(product.name, item.product_id)}
																class="block truncate text-sm font-medium text-foreground hover:text-foreground/80">
																{product.name}
															</a>
														{:else}
															<p class="truncate text-sm font-medium text-foreground">
																Item #{item.product_id.substring(0, 8)}
															</p>
														{/if}
														{#if product?.author}
															<p class="truncate text-xs text-muted-foreground">
																by @{product.author}
															</p>
														{/if}
														<p class="text-xs text-muted-foreground">
															₹{item.price.toLocaleString('en-IN')} × {item.qty}
														</p>
													</div>
												</div>
												<span class="shrink-0 text-sm font-semibold text-foreground">
													₹{(item.price * item.qty).toLocaleString('en-IN')}
												</span>
											</div>
										</div>
									{:catch}
										<div
											class="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
											<Package class="size-4 shrink-0" aria-hidden="true" />
											<span>Could not load item details.</span>
										</div>
									{/await}
								{/each}
							</div>
						{:else}
							<CheckoutLineSkeleton count={2} />
						{/if}

						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Subtotal</span>
							<span class="font-medium text-foreground">
								₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
							</span>
						</div>

						<div class="flex items-center justify-between border-b border-border pb-4 text-sm">
							<div>
								<span class="text-muted-foreground">Shipping</span>
								<p class="text-xs text-muted-foreground">India-wide flat rate</p>
							</div>
							<span class="font-medium text-foreground">
								₹{DELIVERY_FLAT_FEE.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
							</span>
						</div>

						<div class="flex items-center justify-between">
							<span class="font-medium text-foreground">Total</span>
							<span class="text-xl font-semibold text-foreground">
								₹{(subtotal + DELIVERY_FLAT_FEE).toLocaleString('en-IN', {
									minimumFractionDigits: 2
								})}
							</span>
						</div>

						<button
							type="button"
							class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={!hasItems || !addressValid || isPaying}
							onclick={payNow}>
							{isPaying ? 'Opening payment…' : 'Proceed to payment'}
							{#if !isPaying}
								<span aria-hidden="true">→</span>
							{/if}
						</button>

						<div class="text-center">
							<ScButton href="/cart" variant="ghost" class="text-sm">
								<ArrowLeft class="mr-1 inline size-3.5" aria-hidden="true" />
								Return to cart
							</ScButton>
						</div>

						<div
							class="flex items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
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
		</div>
	</div>
</div>
