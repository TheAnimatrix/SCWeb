<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton } from '$lib/components/sc';
	import { toastStore } from '$lib/client/toastStore';
	import { formatOrderDisplayId } from '$lib/formatOrderDisplayId';

	let { data } = $props();

	const SUPPORT_EMAIL = 'support@selfcrafted.in';
	const POLL_MS = 5000;
	const MAX_POLLS = 24;

	let polls = $state(0);
	const needsSupport = $derived(data.soldOut || data.duplicate || data.mismatch);
	const stillChecking = $derived(!needsSupport && !data.confirmed && polls < MAX_POLLS);
	const orderRef = $derived(data.orderId ? formatOrderDisplayId(data.orderId) : null);
	const supportHref = $derived(
		`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
			`Payment ${data.paymentId}${orderRef ? ` for order ${orderRef}` : ''}`
		)}`
	);

	onMount(() => {
		// The load function redirects to the success page once the order shows as paid.
		const timer = setInterval(() => {
			if (!stillChecking) {
				clearInterval(timer);
				return;
			}
			polls += 1;
			void invalidate('checkout:pending');
		}, POLL_MS);
		return () => clearInterval(timer);
	});

	function copyPaymentId() {
		if (navigator.clipboard) {
			void navigator.clipboard.writeText(data.paymentId);
			toastStore.show('Payment ID copied', 'info');
		} else {
			toastStore.show('Copying is not available here. Select the text instead.', 'error');
		}
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-8 md:py-12">
		<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'order' }]} />

		<div class="mt-8 text-center">
			<div
				class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
				<Icon icon={F.clock} class="size-7 text-amber-700 dark:text-amber-300" aria-hidden="true" />
			</div>
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
				{needsSupport ? 'Payment received' : 'Payment received. Confirming your order'}
			</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
				{#if data.soldOut}
					Your payment went through, but an item in this order sold out before we could reserve it.
					<strong class="text-foreground">Do not pay again.</strong>
					Write to {SUPPORT_EMAIL} with your payment ID and we will sort it out.
				{:else}
					<strong class="text-foreground">Do not pay again.</strong>
					{#if data.duplicate}
						This cart was already paid for in an earlier payment, so this payment was not needed.
						Write to {SUPPORT_EMAIL} with the payment ID below so we can sort it out.
					{:else if data.mismatch}
						Your payment went through, but it was for an earlier version of your cart, so we could
						not match it to your order. Write to {SUPPORT_EMAIL} with the payment ID below and we
						will sort it out.
					{:else}
						Razorpay told us your payment went through, but we could not confirm the order yet. We
						will e-mail you when it is confirmed. If no e-mail arrives, write to {SUPPORT_EMAIL} with
						the payment ID below.
					{/if}
				{/if}
			</p>
		</div>

		<div class="mt-8 space-y-4">
			<section class="rounded-lg border border-border bg-card p-5">
				<dl class="space-y-4 text-sm">
					{#if orderRef}
						<div class="flex items-center justify-between gap-4 border-b border-border pb-4">
							<dt class="text-muted-foreground">Order ID</dt>
							<dd class="font-mono font-medium">{orderRef}</dd>
						</div>
					{/if}
					<div class="flex items-center justify-between gap-4">
						<dt class="text-muted-foreground">Payment ID</dt>
						<dd>
							<button
								type="button"
								class="inline-flex min-h-10 items-center gap-1.5 break-all font-mono font-medium text-foreground transition-colors hover:text-foreground/80"
								onclick={copyPaymentId}>
								{data.paymentId}
								<Icon icon={F.copy} class="size-3.5 text-muted-foreground" aria-hidden="true" />
								<span class="sr-only">Copy payment ID</span>
							</button>
						</dd>
					</div>
				</dl>

				{#if !needsSupport}
					<p class="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
						{#if stillChecking}
							Checking again every few seconds. You can leave this page; the e-mail will still come.
						{:else}
							Not confirmed yet. You can leave this page; we will e-mail you when it is confirmed.
						{/if}
					</p>
				{/if}
			</section>

			<div class="flex flex-wrap justify-center gap-3 pt-2">
				<ScButton href={supportHref} variant="secondary">
					<Icon icon={F.mail} class="mr-2 inline size-4" aria-hidden="true" />
					Email support
				</ScButton>
				<ScButton href="/crafts" variant="ghost">Browse crafts</ScButton>
			</div>
		</div>
	</div>
</div>
