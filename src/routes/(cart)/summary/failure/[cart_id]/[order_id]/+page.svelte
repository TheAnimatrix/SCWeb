<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Copy from '@lucide/svelte/icons/copy';
	import Mail from '@lucide/svelte/icons/mail';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton } from '$lib/components/sc';
	import { toastStore } from '$lib/client/toastStore';

	function copyToClipboard(value: string, label: string) {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(value);
			toastStore.show(`${label} copied to clipboard`, 'info');
		} else {
			toastStore.show('Clipboard not supported on HTTP', 'error');
		}
	}

	onMount(() => {
		const cartId = page.params.cart_id;
		const orderId = page.params.order_id;
		if (cartId && orderId) {
			fetch(`/summary/failure/${cartId}/${orderId}`, { method: 'POST' }).catch(() => {});
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-8 md:py-12">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'checkout', href: '/checkout' },
				{ label: 'payment failed' }
			]} />

		<div class="mt-8 text-center">
			<div
				class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
				<CircleX class="size-7 text-red-600 dark:text-red-400" aria-hidden="true" />
			</div>
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Payment unsuccessful</h1>
			<p class="mt-2 text-sm text-muted-foreground">We were unable to process your payment.</p>
		</div>

		<div class="mt-8 space-y-4">
			{#if page.params.cart_id && page.params.order_id}
				<section class="rounded-lg border border-border bg-card p-5">
					<h2 class="text-sm font-medium text-foreground">Transaction details</h2>

					<dl class="mt-4 space-y-4 text-sm">
						<div class="flex items-center justify-between gap-4 border-b border-border pb-4">
							<dt class="text-muted-foreground">Order ID</dt>
							<dd>
								<button
									type="button"
									class="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-foreground/80"
									onclick={() => copyToClipboard(page.params.cart_id ?? '', 'Order ID')}>
									#{page.params.cart_id}
									<Copy class="size-3.5 text-muted-foreground" aria-hidden="true" />
								</button>
							</dd>
						</div>

						<div class="flex items-center justify-between gap-4">
							<dt class="text-muted-foreground">Payment ID</dt>
							<dd>
								<button
									type="button"
									class="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-foreground/80"
									onclick={() => copyToClipboard(page.params.order_id ?? '', 'Payment ID')}>
									#{page.params.order_id}
									<Copy class="size-3.5 text-muted-foreground" aria-hidden="true" />
								</button>
							</dd>
						</div>
					</dl>
				</section>
			{/if}

			<section class="rounded-lg border border-border bg-card p-5">
				<div class="flex items-center gap-2">
					<HelpCircle class="size-4 text-foreground" aria-hidden="true" />
					<h2 class="text-sm font-medium text-foreground">Need help?</h2>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">
					If any money was deducted from your account, contact our support team with a screenshot of
					this page and we will initiate a refund immediately.
				</p>
				<div class="mt-4">
					<ScButton
						href={page.params.cart_id && page.params.order_id
							? `mailto:support@selfcrafted.in?subject=Failed%20payment%20with%20orderId%20%23${page.params.cart_id}%20and%20paymentId%20%23${page.params.order_id}`
							: 'mailto:support@selfcrafted.in'}
						target="_blank"
						rel="noopener noreferrer"
						variant="secondary"
						class="w-full justify-center">
						<Mail class="mr-2 inline size-4" aria-hidden="true" />
						Contact support
					</ScButton>
				</div>
			</section>

			<div class="flex flex-wrap justify-center gap-3 pt-2">
				<ScButton href="/checkout" variant="secondary">
					<ArrowLeft class="mr-1 inline size-3.5" aria-hidden="true" />
					Try again
				</ScButton>
				<ScButton href="/cart" variant="ghost">Return to cart</ScButton>
			</div>
		</div>
	</div>
</div>
