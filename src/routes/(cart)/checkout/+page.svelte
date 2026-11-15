<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext, onMount } from 'svelte';
	import { type Writable } from 'svelte/store';
	import { env } from '$env/dynamic/public';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import { PlaceholderImage, ScButton, MakerAttribution } from '$lib/components/sc';
	import {
		confirmCheckout,
		createCheckoutOrder,
		failCheckout,
		stockLimitMessage,
		type CartApiError,
		type CartG
	} from '$lib/client/cartApi';
	import { newAddress, asAddressList, normalizeAddress, type Address } from '$lib/types/product';
	import type {
		RazorpayCheckoutSuccessResponse,
		RazorpayPaymentFailedResponse
	} from '$lib/types/razorpay';
	import { toastStore } from '$lib/client/toastStore.js';
	import { loadRazorpay, openRazorpayCheckout } from '$lib/client/razorpay';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { formatInr } from '$lib/utils/format';
	import { productPath } from '$lib/seo/product';

	let { data } = $props();

	const SUPPORT_EMAIL = 'support@selfcrafted.in';
	const START_FAILED = `Couldn't start payment. Nothing was charged. Try again or write to ${SUPPORT_EMAIL}.`;

	// Never undefined: bound into AddressInputSelector whose `address` prop is
	// $bindable with a fallback; binding undefined throws props_invalid_value.
	let validAddress: Address = $state(newAddress());
	let validBillingAddress: Address = $state(newAddress());
	const addresses = $derived(asAddressList(data.addresses));

	const cartData = $derived(data.cart);
	const subtotal = $derived(cartData?.subtotal ?? 0);
	const deliveryFee = $derived(cartData?.deliveryFee ?? 0);
	const cartTotal = $derived(cartData?.total ?? 0);
	const cartItems = $derived(cartData?.items ?? []);
	const hasItems = $derived(cartItems.length > 0);

	let addressValid: boolean = $state(false);
	let billingAddressValid: boolean = $state(false);
	let billingSameAsShipping = $state(true);
	let shippingFormType: string = $state('text');
	let saveToAddressBook = $state(true);
	let savedAddressKey: string | null = null;

	let shippingSelector: AddressInputSelector | undefined = $state();
	let billingSelector: AddressInputSelector | undefined = $state();

	/** Shown next to the Pay button, so a blocked payment always says why. */
	let payError: string | null = $state(null);
	/** Cart line that blocked payment (sold out or no longer listed). */
	let problemItem: { productId: string; message: string } | null = $state(null);

	type PayStage = 'idle' | 'starting' | 'open' | 'confirming';
	let payStage = $state<PayStage>('idle');
	const isPaying = $derived(payStage !== 'idle');

	const canSaveAddress = $derived(
		data.userExists && shippingFormType === 'edit' && !validAddress.id
	);

	function handleBillingSameChange() {
		if (billingSameAsShipping) return;
		// Start the billing form from the shipping address; the buyer edits what differs.
		validBillingAddress = { ...normalizeAddress(validAddress), id: undefined };
		billingAddressValid = false;
	}

	const cart_store = getContext<Writable<CartG>>('userCartStatus');

	onMount(() => {
		void loadRazorpay().catch(() => {
			// payNow() surfaces an error if the SDK is still unavailable.
		});
	});

	function razorpayLogoUrl(): string {
		return new URL('/favicon.png', window.location.origin).href;
	}

	function pendingHref(
		response: RazorpayCheckoutSuccessResponse,
		reason: 'stock' | 'duplicate' | 'mismatch' | null
	): string {
		const query = `order=${encodeURIComponent(response.razorpay_order_id)}${reason ? `&reason=${reason}` : ''}`;
		return `/summary/pending/${encodeURIComponent(response.razorpay_payment_id)}?${query}`;
	}

	function failureHref(
		cartId: string,
		razorpayOrderId: string,
		failure: RazorpayPaymentFailedResponse
	): string {
		const parts: string[] = [];
		const reason = failure.error?.description;
		const paymentId = failure.error?.metadata?.payment_id;
		if (reason) parts.push(`reason=${encodeURIComponent(reason.slice(0, 160))}`);
		if (paymentId) parts.push(`payment=${encodeURIComponent(paymentId)}`);
		const query = parts.length ? `?${parts.join('&')}` : '';
		return `/summary/failure/${cartId}/${encodeURIComponent(razorpayOrderId)}${query}`;
	}

	/** Retries short network or server blips before giving up on confirmation. */
	async function confirmWithRetry(response: RazorpayCheckoutSuccessResponse) {
		const ids = {
			razorpayOrderId: response.razorpay_order_id,
			razorpayPaymentId: response.razorpay_payment_id,
			razorpaySignature: response.razorpay_signature
		};
		let result = await confirmCheckout(fetch, ids);
		for (let attempt = 1; attempt <= 2; attempt++) {
			if (result.ok) break;
			const retryable = ['network', 'unknown', 'rate_limited'].includes(result.error.kind);
			if (!retryable) break;
			await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
			result = await confirmCheckout(fetch, ids);
		}
		return result;
	}

	async function saveAddressIfAsked() {
		if (!canSaveAddress || !saveToAddressBook) return;
		const key = JSON.stringify(validAddress);
		if (savedAddressKey === key) return;
		try {
			const { error } = await requireBrowserSupabase(data.supabase)
				.from('addresses')
				.insert([
					{
						name: validAddress.name,
						line1: validAddress.line1,
						line2: validAddress.line2 || null,
						city: validAddress.city,
						pincode: validAddress.pincode,
						state: validAddress.state,
						phone: validAddress.phone
					}
				]);
			if (error) throw error;
			savedAddressKey = key;
		} catch {
			// Not worth blocking payment over; the order still carries the address.
			toastStore.show("We couldn't save this address to your account.", 'warning');
		}
	}

	async function handleOrderError(error: CartApiError) {
		if (error.kind === 'unauthorized' || (error.kind === 'cart_empty' && data.userExists)) {
			// Session ended mid-checkout: the API fell back to an empty guest cart.
			toastStore.show('Your session has ended. Sign in again to continue.', 'warning');
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- static path with a query string
			await goto('/user/sign?postLogin=/checkout');
			return;
		}
		if (error.kind === 'cart_empty') {
			await goto(resolve('/cart'));
			return;
		}
		if (error.kind === 'already_paid' && error.orderId && error.paymentId) {
			// An earlier payment window for this cart was paid after all. Never offer Pay again.
			cart_store.set({ valid: true, itemCount: 0 });
			await goto(
				resolve('/(cart)/summary/success/[cart_id]/[payment_id]', {
					cart_id: error.orderId,
					payment_id: error.paymentId
				})
			);
			return;
		}
		if (error.kind === 'already_paid') {
			// Paid already, but the payment ID is not known here. Never offer Pay again.
			cart_store.set({ valid: true, itemCount: 0 });
			payError = `${error.message} Do not pay again. Check your e-mail for the receipt, or write to ${SUPPORT_EMAIL}.`;
			return;
		}
		if (error.kind === 'insufficient_stock' || error.kind === 'listing_not_available') {
			const item = cartItems.find((line) => line.productId === error.productId);
			const message =
				error.kind === 'insufficient_stock'
					? stockLimitMessage(error.limit, item?.name)
					: `${item?.name ?? 'An item'} is no longer available. Remove it to check out.`;
			problemItem = error.productId ? { productId: error.productId, message } : null;
			payError = message;
			await invalidate('cart:change');
			return;
		}
		payError =
			error.kind === 'razorpay_order_failed' || error.kind === 'unknown'
				? START_FAILED
				: error.message;
	}

	async function payNow() {
		if (isPaying) return;
		payError = null;
		problemItem = null;

		if (!cartData) {
			payError = "Your cart didn't load. Refresh the page and try again.";
			return;
		}

		const shippingOk = shippingSelector ? await shippingSelector.validateAndFocus() : addressValid;
		if (!shippingOk) {
			payError = 'Check the highlighted fields in your shipping address.';
			return;
		}

		if (!billingSameAsShipping) {
			const billingOk = billingSelector
				? await billingSelector.validateAndFocus()
				: billingAddressValid;
			if (!billingOk) {
				payError = 'Check the highlighted fields in your billing address.';
				return;
			}
		}

		const razorpayKey = env.PUBLIC_RAZORPAY_ID;
		if (!razorpayKey) {
			payError = `Payments are not available right now. Nothing was charged. Write to ${SUPPORT_EMAIL} if this continues.`;
			return;
		}

		payStage = 'starting';
		await saveAddressIfAsked();

		try {
			const billingAddress = billingSameAsShipping ? undefined : validBillingAddress;
			const cartId = cartData.id;

			let refreshPayment = false;
			for (let attempt = 0; attempt < 2; attempt++) {
				const orderResult = await createCheckoutOrder(fetch, validAddress, billingAddress, {
					refreshPayment
				});

				if (!orderResult.ok) {
					payStage = 'idle';
					await handleOrderError(orderResult.error);
					return;
				}

				const { razorpayOrderId, amountPaise, totalRupees } = orderResult.data;

				if (amountPaise !== totalRupees * 100) {
					payError = START_FAILED;
					payStage = 'idle';
					return;
				}

				if (totalRupees !== cartData.total) {
					if (!refreshPayment) {
						refreshPayment = true;
						continue;
					}
					payError = `Your cart total changed to ${formatInr(totalRupees)}. Check it, then press Pay again.`;
					await invalidate('cart:change');
					payStage = 'idle';
					return;
				}

				// Written from Razorpay callbacks; the casts stop TS narrowing them to their initial values.
				let paymentCaptured = false as boolean;
				let lastFailure = null as RazorpayPaymentFailedResponse | null;
				payStage = 'open';

				const outcome = await openRazorpayCheckout({
					key: razorpayKey,
					amount: amountPaise,
					currency: 'INR',
					name: 'Selfcrafted',
					image: razorpayLogoUrl(),
					order_id: razorpayOrderId,
					handler: async function (response) {
						// Razorpay says the money moved. From here on, never offer Pay again.
						paymentCaptured = true;
						payStage = 'confirming';
						try {
							const confirmResult = await confirmWithRetry(response);
							if (confirmResult.ok) {
								cart_store.set({ valid: true, itemCount: 0 });
								await goto(
									resolve('/(cart)/summary/success/[cart_id]/[payment_id]', {
										cart_id: confirmResult.data.orderId,
										payment_id: response.razorpay_payment_id
									})
								);
								return;
							}
							const kind = confirmResult.error.kind;
							const reason =
								kind === 'stock_conflict'
									? 'stock'
									: kind === 'duplicate_payment'
										? 'duplicate'
										: kind === 'payment_mismatch'
											? 'mismatch'
											: null;
							if (reason) cart_store.set({ valid: true, itemCount: 0 });
							// eslint-disable-next-line svelte/no-navigation-without-resolve -- result page built from Razorpay ids
							await goto(pendingHref(response, reason));
						} catch {
							window.location.href = pendingHref(response, null);
						}
					},
					prefill: {
						...(validAddress.name ? { name: validAddress.name } : {}),
						...(validAddress.email || data.email
							? { email: validAddress.email || data.email || '' }
							: {}),
						...(validAddress.phone ? { contact: validAddress.phone } : {})
					},
					theme: {
						color: '#2084fe'
					},
					onPaymentFailed: function (failedResponse) {
						// Razorpay keeps its modal open with "Retry" / "pay another way"; just record it.
						lastFailure = failedResponse;
						const failedOrderId = failedResponse.error?.metadata?.order_id ?? razorpayOrderId;
						void failCheckout(fetch, failedOrderId, failedResponse.error?.description).catch(() => {
							// The webhook records the failure too.
						});
					}
				});

				if (paymentCaptured) {
					// The handler is navigating to the success or "confirming" page.
					return;
				}

				if (outcome === 'init_failed' && attempt === 0) {
					refreshPayment = true;
					continue;
				}

				payStage = 'idle';

				if (outcome === 'init_failed') {
					payError = START_FAILED;
					return;
				}

				if (outcome === 'failed' && lastFailure) {
					// eslint-disable-next-line svelte/no-navigation-without-resolve -- result page built from Razorpay ids
					await goto(failureHref(cartId, razorpayOrderId, lastFailure));
					return;
				}

				if (outcome === 'dismissed') {
					toastStore.show('Payment cancelled. Your cart is saved. You can try again.', 'info');
				} else if (outcome === 'failed') {
					payError = START_FAILED;
				}
				return;
			}
		} catch {
			payError = START_FAILED;
			payStage = 'idle';
		}
	}

	const payLabel = $derived(
		payStage === 'starting'
			? 'Opening payment…'
			: payStage === 'open'
				? 'Waiting for payment…'
				: payStage === 'confirming'
					? 'Confirming payment…'
					: `Pay ${formatInr(cartTotal)}`
	);
</script>

{#snippet addressForms()}
	<AddressInputSelector
		bind:this={shippingSelector}
		email={data.email}
		userExists={data.userExists}
		{addresses}
		idPrefix="ship"
		autocompleteSection="shipping"
		bind:type={shippingFormType}
		bind:address={validAddress}
		bind:addressValid />

	{#if canSaveAddress}
		<label class="flex cursor-pointer items-center gap-3 px-1 text-sm text-foreground">
			<input
				type="checkbox"
				class="size-4 rounded border-border text-primary focus:ring-primary"
				bind:checked={saveToAddressBook} />
			Save to my addresses
		</label>
	{/if}

	<label class="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-4">
		<input
			type="checkbox"
			class="size-4 rounded border-border text-primary focus:ring-primary"
			bind:checked={billingSameAsShipping}
			onchange={handleBillingSameChange} />
		<span class="text-sm text-foreground">Billing address same as shipping</span>
	</label>

	{#if !billingSameAsShipping}
		<AddressInputSelector
			bind:this={billingSelector}
			title="Billing address"
			email={data.email}
			userExists={data.userExists}
			{addresses}
			idPrefix="bill"
			autocompleteSection="billing"
			bind:address={validBillingAddress}
			bind:addressValid={billingAddressValid} />
	{/if}
{/snippet}

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
				Add your shipping and billing details to complete your purchase.
			</p>
		</div>

		<div class="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
			<div class="flex-1 space-y-4">
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
				{:else if !data.userExists}
					<div class="rounded-lg border border-border bg-card p-5">
						<div class="flex items-start gap-3">
							<div class="rounded-full bg-muted p-2">
								<Icon icon={F.personCircle} class="size-5 text-foreground" aria-hidden="true" />
							</div>
							<div class="min-w-0 flex-1">
								<h2 class="text-sm font-medium text-foreground">Have an account?</h2>
								<p class="mt-1 text-sm text-muted-foreground">
									Sign in to use your saved addresses and see this order later.
								</p>
								<div class="mt-4">
									<ScButton href="/user/sign?postLogin=/checkout" variant="secondary">
										<Icon icon={F.signIn} class="mr-2 inline size-4" aria-hidden="true" />
										Sign in
									</ScButton>
								</div>
							</div>
						</div>

						<div class="relative my-6">
							<div class="absolute inset-0 flex items-center" aria-hidden="true">
								<div class="w-full border-t border-border"></div>
							</div>
							<div class="relative flex justify-center">
								<span class="bg-card px-3 text-sm text-muted-foreground"
									>Or continue as a guest</span>
							</div>
						</div>

						<div class="space-y-4">
							{@render addressForms()}
						</div>
					</div>
				{:else}
					<div class="space-y-4">
						{@render addressForms()}
					</div>
				{/if}
			</div>

			<aside class="w-full lg:w-80 lg:shrink-0">
				<div class="sticky top-20 rounded-lg border border-border bg-card">
					<div class="flex items-center gap-2 border-b border-border px-5 py-4">
						<Icon icon={F.receipt} class="size-4 text-foreground" aria-hidden="true" />
						<h2 class="text-sm font-medium text-foreground">Order summary</h2>
					</div>

					<div class="space-y-4 p-5">
						{#if hasItems}
							<div class="max-h-60 space-y-3 overflow-y-auto pr-1">
								<!-- eslint-disable svelte/no-navigation-without-resolve -- productPath builds the canonical product URL -->
								{#each cartItems as item (item.productId)}
									{@const href = productPath({ id: item.productId, name: item.name })}
									<div class="border-b border-border pb-3 last:border-0 last:pb-0">
										<div class="flex items-center justify-between gap-3">
											<div class="flex min-w-0 flex-1 items-center gap-3">
												<a {href} class="size-16 shrink-0 overflow-hidden rounded-md">
													{#if item.imageUrl}
														<PlaceholderImage src={item.imageUrl} alt={item.name} class="size-16" />
													{:else}
														<div
															class="flex size-16 items-center justify-center rounded-md bg-muted">
															<Icon
																icon={F.box}
																class="size-5 text-muted-foreground"
																aria-hidden="true" />
														</div>
													{/if}
												</a>
												<div class="min-w-0">
													<a
														{href}
														class="block truncate text-sm font-medium text-foreground hover:text-foreground/80">
														{item.name}
													</a>
													{#if item.author}
														<MakerAttribution
															username={item.author}
															tier={item.authorTier}
															class="mt-0.5" />
													{/if}
													<p class="text-xs text-muted-foreground">
														{formatInr(item.unitPrice)} × {item.qty}
													</p>
												</div>
											</div>
											<span class="shrink-0 text-sm font-semibold text-foreground">
												{formatInr(item.unitPrice * item.qty)}
											</span>
										</div>
										{#if problemItem?.productId === item.productId}
											<p class="mt-2 text-xs text-destructive">
												{problemItem.message}
												<a href={resolve('/cart')} class="underline underline-offset-2"
													>Review your cart</a>
											</p>
										{/if}
									</div>
								{/each}
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							</div>
						{/if}

						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Subtotal</span>
							<span class="font-medium text-foreground">{formatInr(subtotal)}</span>
						</div>

						<div class="flex items-center justify-between border-b border-border pb-4 text-sm">
							<div>
								<span class="text-muted-foreground">Delivery</span>
								<p class="text-xs text-muted-foreground">Flat rate within India</p>
							</div>
							<span class="font-medium text-foreground">{formatInr(deliveryFee)}</span>
						</div>

						<div class="flex items-center justify-between">
							<span class="font-medium text-foreground">Total</span>
							<span class="text-xl font-semibold text-foreground">{formatInr(cartTotal)}</span>
						</div>

						<p class="text-xs text-muted-foreground">
							Orders ship in 3 to 14 days. To cancel, write to {SUPPORT_EMAIL} the same day. By paying
							you agree to our
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static policy anchor -->
							<a href="/policy#terms" class="underline underline-offset-2">terms</a>.
						</p>

						<button
							type="button"
							class="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
							disabled={!hasItems || isPaying || data.apiError}
							aria-describedby={payError ? 'pay-error' : undefined}
							onclick={payNow}>
							{payLabel}
							{#if !isPaying}
								<span
									class="transition-transform duration-200 group-hover:translate-x-0.5"
									aria-hidden="true">→</span>
							{/if}
						</button>

						<p id="pay-error" class="text-sm text-destructive empty:hidden" role="alert">
							{payError ?? ''}
						</p>

						{#if payStage === 'confirming'}
							<p class="text-xs text-muted-foreground" role="status">
								Payment received. Confirming your order. Don't close this page or pay again.
							</p>
						{/if}

						<div class="text-center">
							<ScButton href="/cart" variant="ghost" class="text-sm">
								<Icon icon={F.arrowLeft} class="mr-1 inline size-3.5" aria-hidden="true" />
								Return to cart
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
		</div>
	</div>
</div>
