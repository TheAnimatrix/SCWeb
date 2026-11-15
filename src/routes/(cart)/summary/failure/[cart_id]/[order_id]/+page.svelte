<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton } from '$lib/components/sc';
	import { toastStore } from '$lib/client/toastStore';

	let { data } = $props();

	const SUPPORT_EMAIL = 'support@selfcrafted.in';

	const supportHref = $derived(
		`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
			`Failed payment, Razorpay order ${data.razorpayOrderId}${data.paymentId ? `, payment ${data.paymentId}` : ''}`
		)}`
	);

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
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'checkout', href: '/checkout' },
				{ label: 'payment failed' }
			]} />

		<div class="mt-8 text-center">
			<div
				class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
				<Icon
					icon={F.dismissCircle}
					class="size-7 text-red-600 dark:text-red-400"
					aria-hidden="true" />
			</div>
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Payment unsuccessful</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
				The payment did not go through.{#if data.reason}&nbsp;Reason: {data.reason}{/if}
				{#if !data.isPrint}Your cart is saved.{/if}
			</p>
			<div class="mt-6 flex flex-wrap justify-center gap-3">
				<ScButton href={data.retryHref} arrow>Try payment again</ScButton>
				{#if !data.isPrint}
					<ScButton href="/cart" variant="ghost">Return to cart</ScButton>
				{/if}
			</div>
		</div>

		<div class="mt-8 space-y-4">
			<section class="rounded-lg border border-border bg-card p-5">
				<h2 class="text-sm font-medium text-foreground">Details</h2>

				<dl class="mt-4 space-y-4 text-sm">
					<div class="flex items-center justify-between gap-4">
						<dt class="text-muted-foreground">Razorpay order</dt>
						<dd>
							<button
								type="button"
								class="inline-flex min-h-10 items-center gap-1.5 break-all font-mono font-medium text-foreground transition-colors hover:text-foreground/80"
								onclick={() => copyToClipboard(data.razorpayOrderId, 'Razorpay order')}>
								{data.razorpayOrderId}
								<Icon icon={F.copy} class="size-3.5 text-muted-foreground" aria-hidden="true" />
								<span class="sr-only">Copy Razorpay order</span>
							</button>
						</dd>
					</div>

					{#if data.paymentId}
						<div class="flex items-center justify-between gap-4 border-t border-border pt-4">
							<dt class="text-muted-foreground">Payment ID</dt>
							<dd>
								<button
									type="button"
									class="inline-flex min-h-10 items-center gap-1.5 break-all font-mono font-medium text-foreground transition-colors hover:text-foreground/80"
									onclick={() => copyToClipboard(data.paymentId ?? '', 'Payment ID')}>
									{data.paymentId}
									<Icon icon={F.copy} class="size-3.5 text-muted-foreground" aria-hidden="true" />
									<span class="sr-only">Copy payment ID</span>
								</button>
							</dd>
						</div>
					{/if}
				</dl>
			</section>

			<section class="rounded-lg border border-border bg-card p-5">
				<div class="flex items-center gap-2">
					<Icon icon={F.questionCircle} class="size-4 text-foreground" aria-hidden="true" />
					<h2 class="text-sm font-medium text-foreground">Was money taken?</h2>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">
					If money left your account, your bank normally reverses it within 5 to 7 working days. If
					it doesn't, write to {SUPPORT_EMAIL} with the details above.
				</p>
				<div class="mt-4">
					<ScButton href={supportHref} variant="secondary" class="w-full justify-center">
						<Icon icon={F.mail} class="mr-2 inline size-4" aria-hidden="true" />
						Email support
					</ScButton>
				</div>
			</section>
		</div>
	</div>
</div>
