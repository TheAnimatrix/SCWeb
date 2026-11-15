<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { invalidateAll } from '$app/navigation';
	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton } from '$lib/components/sc';
	import { toastStore } from '$lib/client/toastStore';
	import { formatOrderDisplayId } from '$lib/formatOrderDisplayId';
	import { formatInr } from '$lib/utils/format';
	import { productPath } from '$lib/seo/product';

	let { data } = $props();

	const SUPPORT_EMAIL = 'support@selfcrafted.in';
	const WHATSAPP = '+91 86374 52606';

	const cartOrder = $derived(data.order?.kind === 'cart_order' ? data.order : null);
	const printOrder = $derived(data.order?.kind === 'print_request' ? data.order : null);
	const isPaid = $derived(
		cartOrder ? cartOrder.status === 'paid' || cartOrder.status === 'fulfilled' : false
	);
	const orderRef = $derived(cartOrder ? formatOrderDisplayId(cartOrder.orderId) : null);
	const receiptEmail = $derived(cartOrder?.email ?? data.accountEmail);
	const supportSubject = $derived(orderRef ? `Order ${orderRef}` : `Payment ${data.paymentId}`);

	function copyToClipboard(value: string, label: string) {
		if (navigator.clipboard) {
			void navigator.clipboard.writeText(value);
			toastStore.show(`${label} copied`, 'info');
		} else {
			toastStore.show('Copying is not available here. Select the text instead.', 'error');
		}
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-8 md:py-12">
		<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'order' }]} />

		{#if cartOrder && isPaid}
			<div class="mt-8 text-center">
				<div
					class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
					<Icon
						icon={F.checkCircle}
						class="size-7 text-green-600 dark:text-green-400"
						aria-hidden="true" />
				</div>
				<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Payment successful</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Your order {orderRef} is confirmed. Orders ship in 3 to 14 days.
				</p>
			</div>
		{:else if cartOrder}
			<div class="mt-8 text-center">
				<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Order {orderRef}</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					This order is not confirmed yet. Don't pay again. If you were charged, write to
					{SUPPORT_EMAIL} with the payment ID below.
				</p>
			</div>
		{:else if printOrder}
			<div class="mt-8 text-center">
				<div
					class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
					<Icon
						icon={F.checkCircle}
						class="size-7 text-green-600 dark:text-green-400"
						aria-hidden="true" />
				</div>
				<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
					{printOrder.paid ? 'Payment successful' : 'Payment received'}
				</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Your print request has been updated with this payment.
				</p>
			</div>
		{:else if data.lookupFailed}
			<div class="mt-8 text-center">
				<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
					We couldn't load your order
				</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Your payment is not affected. Try again in a moment.
				</p>
				<div class="mt-4">
					<ScButton variant="secondary" onclick={() => invalidateAll()}>Retry</ScButton>
				</div>
			</div>
		{:else}
			<div class="mt-8 text-center">
				<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Order not found</h1>
				<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
					We couldn't find this order for your account or this device. If you paid, check your
					e-mail for the receipt, or write to {SUPPORT_EMAIL} with the payment ID below.
				</p>
			</div>
		{/if}

		<div class="mt-8 space-y-4">
			<section class="rounded-lg border border-border bg-card p-5">
				<h2 class="text-sm font-medium text-foreground">Details</h2>

				<dl class="mt-4 space-y-4 text-sm">
					{#if cartOrder && orderRef}
						<div class="flex items-center justify-between gap-4 border-b border-border pb-4">
							<dt class="text-muted-foreground">Order ID</dt>
							<dd>
								<button
									type="button"
									class="inline-flex min-h-10 items-center gap-1.5 font-mono font-medium text-foreground transition-colors hover:text-foreground/80"
									title={cartOrder.orderId}
									onclick={() => copyToClipboard(orderRef, 'Order ID')}>
									{orderRef}
									<Icon icon={F.copy} class="size-3.5 text-muted-foreground" aria-hidden="true" />
									<span class="sr-only">Copy order ID</span>
								</button>
							</dd>
						</div>
					{/if}

					<div class="flex items-center justify-between gap-4">
						<dt class="text-muted-foreground">Payment ID</dt>
						<dd>
							<button
								type="button"
								class="inline-flex min-h-10 items-center gap-1.5 break-all font-mono font-medium text-foreground transition-colors hover:text-foreground/80"
								onclick={() => copyToClipboard(data.paymentId, 'Payment ID')}>
								{data.paymentId}
								<Icon icon={F.copy} class="size-3.5 text-muted-foreground" aria-hidden="true" />
								<span class="sr-only">Copy payment ID</span>
							</button>
						</dd>
					</div>
				</dl>

				{#if cartOrder && isPaid && receiptEmail}
					<p class="mt-4 text-sm text-muted-foreground">
						A receipt is on its way to {receiptEmail}.
					</p>
				{/if}
			</section>

			{#if cartOrder}
				<section class="rounded-lg border border-border bg-card p-5">
					<h2 class="text-sm font-medium text-foreground">Items</h2>
					<ul class="mt-4 space-y-3 text-sm">
						{#each cartOrder.items as item (item.productId)}
							<li class="flex items-start justify-between gap-4">
								<!-- eslint-disable svelte/no-navigation-without-resolve -- productPath builds the canonical product URL -->
								<a
									href={productPath({ id: item.productId, name: item.name })}
									class="min-w-0 text-foreground hover:text-foreground/80">
									{item.name}
									<span class="text-muted-foreground">× {item.qty}</span>
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
								<span class="shrink-0 font-medium"
									>{formatInr(item.unitPriceRupees * item.qty)}</span>
							</li>
						{/each}
					</ul>
					<dl class="mt-4 space-y-2 border-t border-border pt-4 text-sm">
						<div class="flex justify-between">
							<dt class="text-muted-foreground">Subtotal</dt>
							<dd>{formatInr(cartOrder.subtotalRupees)}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-muted-foreground">Delivery</dt>
							<dd>{formatInr(cartOrder.deliveryFeeRupees)}</dd>
						</div>
						<div class="flex justify-between font-semibold">
							<dt>Total paid</dt>
							<dd>{formatInr(cartOrder.totalRupees)}</dd>
						</div>
					</dl>

					{#if cartOrder.shipping}
						<div class="mt-4 border-t border-border pt-4 text-sm">
							<h3 class="font-medium text-foreground">Shipping to</h3>
							<p class="mt-1 text-muted-foreground">
								{cartOrder.shipping.name}<br />
								{cartOrder.shipping.line1}{#if cartOrder.shipping.line2}, {cartOrder.shipping
										.line2}{/if}<br />
								{cartOrder.shipping.city}, {cartOrder.shipping.state}
								{cartOrder.shipping.pincode}
							</p>
						</div>
					{/if}
				</section>
			{/if}

			<section class="rounded-lg border border-border bg-card p-5">
				<div class="flex items-center gap-2">
					<Icon icon={F.questionCircle} class="size-4 text-foreground" aria-hidden="true" />
					<h2 class="text-sm font-medium text-foreground">Questions?</h2>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">
					Write to {SUPPORT_EMAIL} or WhatsApp {WHATSAPP}{#if orderRef}&nbsp;with order {orderRef}{/if}.
					To cancel, write to us the same day.
				</p>
				<div class="mt-4">
					<ScButton
						href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(supportSubject)}`}
						variant="secondary"
						class="w-full justify-center">
						<Icon icon={F.mail} class="mr-2 inline size-4" aria-hidden="true" />
						Email support
					</ScButton>
				</div>
			</section>

			<div class="flex flex-wrap justify-center gap-3 pt-2">
				{#if printOrder}
					<ScButton href={`/3dp-portal/user/${printOrder.printRequestId}`} variant="secondary">
						View print request
					</ScButton>
				{:else if data.signedIn}
					<ScButton href="/user/profile/orders" variant="secondary">View orders</ScButton>
				{/if}
				<ScButton href="/crafts" arrow>Browse crafts</ScButton>
			</div>
		</div>
	</div>
</div>
