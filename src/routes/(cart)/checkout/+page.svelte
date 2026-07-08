<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { getContext } from 'svelte';
	import { type Writable } from 'svelte/store';
	import { env } from '$env/dynamic/public';
	import UserCircle from '@lucide/svelte/icons/user-circle';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Receipt from '@lucide/svelte/icons/receipt';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Lock from '@lucide/svelte/icons/lock';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Package from '@lucide/svelte/icons/package';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import { PlaceholderImage, ScButton } from '$lib/components/sc';
	import {
		confirmCheckout,
		createCheckoutOrder,
		failCheckout,
		type CartG
	} from '$lib/client/cartApi';
	import { newAddress, validateAddress, asAddressList, type Address } from '$lib/types/product';
	import { toastStore } from '$lib/client/toastStore.js';

	let { data } = $props();

	// Never undefined: bound into AddressInputSelector whose `address` prop is
	// $bindable with a fallback — binding undefined throws props_invalid_value
	// on first render (the init $effect runs after render).
	let validAddress: Address = $state(newAddress());
	const addresses = $derived(asAddressList(data.addresses));

	const cartData = $derived(data.cart);
	const subtotal = $derived(cartData?.subtotal ?? 0);
	const deliveryFee = $derived(cartData?.deliveryFee ?? 0);
	const cartTotal = $derived(cartData?.total ?? 0);
	const cartItems = $derived(cartData?.items ?? []);
	const hasItems = $derived(cartItems.length > 0);

	let addressValid: boolean = $state(false);
	let addressInitialized = $state(false);

	$effect(() => {
		if (addressInitialized) return;

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

		addressInitialized = true;
	});

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

		try {
			const orderResult = await createCheckoutOrder(fetch, validAddress);

			if (!orderResult.ok) {
				toastStore.show(orderResult.error.message, 'error');
				isPaying = false;
				return;
			}

			const { razorpayOrderId, amountPaise } = orderResult.data;
			const cartId = cartData.id;

			const razorpayKey = env.PUBLIC_RAZORPAY_ID;
			if (!razorpayKey) {
				toastStore.show('Payment is not configured. Please contact support.', 'error');
				isPaying = false;
				return;
			}

			const options = {
				key: razorpayKey,
				amount: amountPaise,
				currency: 'INR',
				name: 'SelfCrafted',
				image:
					'https://pfeewicqoxkuwnbuxnoz.supabase.co/storage/v1/object/public/images/favicon.png',
				order_id: razorpayOrderId,
				handler: async function (response: {
					razorpay_order_id: string;
					razorpay_payment_id: string;
					razorpay_signature: string;
				}) {
					const confirmResult = await confirmCheckout(fetch, {
						razorpayOrderId: response.razorpay_order_id,
						razorpayPaymentId: response.razorpay_payment_id,
						razorpaySignature: response.razorpay_signature
					});
					if (!confirmResult.ok) {
						toastStore.show(confirmResult.error.message, 'error');
						isPaying = false;
						return;
					}
					cart_store.set({ valid: true, itemCount: 0 });
					isPaying = false;
					goto(`/summary/success/${cartId}/${response.razorpay_payment_id}`);
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

			if (typeof Razorpay === 'undefined') {
				toastStore.show('Payment provider is unavailable. Please try again.', 'error');
				isPaying = false;
				return;
			}

			const rzp1 = new Razorpay(options);
			rzp1.open();
			rzp1.on('payment.failed', async function (response: unknown) {
				const failedResponse = response as {
					error?: { metadata?: { order_id?: string }; description?: string };
				};
				isPaying = false;
				rzp1.close();
				const orderId = failedResponse.error?.metadata?.order_id;
				if (!orderId) {
					goto('/summary/failure');
					return;
				}
				try {
					await failCheckout(fetch, orderId, failedResponse.error?.description);
				} catch {
					// Still navigate so the user sees the failure page.
				}
				window.location.href = `/summary/failure/${cartId}/${orderId}`;
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
				{#if data.apiError}
					<div
						class="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
						<div class="flex items-center gap-3">
							<AlertCircle class="size-5 shrink-0 text-foreground" aria-hidden="true" />
							<p>Could not load your cart. Try refreshing the page.</p>
						</div>
						<ScButton variant="secondary" onclick={() => invalidate('cart:change')}>Retry</ScButton>
					</div>
				{:else if !data.userExists}
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
								{#each cartItems as item (item.productId)}
									<div class="border-b border-border pb-3 last:border-0 last:pb-0">
										<div class="flex items-center justify-between gap-3">
											<div class="flex min-w-0 flex-1 items-center gap-3">
												<a
													href={productHref(item.name, item.productId)}
													class="size-16 shrink-0 overflow-hidden rounded-md">
													{#if item.imageUrl}
														<PlaceholderImage src={item.imageUrl} alt={item.name} class="size-16" />
													{:else}
														<div
															class="flex size-16 items-center justify-center rounded-md bg-muted">
															<Package class="size-5 text-muted-foreground" aria-hidden="true" />
														</div>
													{/if}
												</a>
												<div class="min-w-0">
													<a
														href={productHref(item.name, item.productId)}
														class="block truncate text-sm font-medium text-foreground hover:text-foreground/80">
														{item.name}
													</a>
													{#if item.author}
														<p class="truncate text-xs text-muted-foreground">
															by @{item.author}
														</p>
													{/if}
													<p class="text-xs text-muted-foreground">
														₹{item.unitPrice.toLocaleString('en-IN')} × {item.qty}
													</p>
												</div>
											</div>
											<span class="shrink-0 text-sm font-semibold text-foreground">
												₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
											</span>
										</div>
									</div>
								{/each}
							</div>
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
								₹{deliveryFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
							</span>
						</div>

						<div class="flex items-center justify-between">
							<span class="font-medium text-foreground">Total</span>
							<span class="text-xl font-semibold text-foreground">
								₹{cartTotal.toLocaleString('en-IN', {
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
