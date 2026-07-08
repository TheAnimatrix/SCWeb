<script lang="ts">
	import { page } from '$app/state';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Copy from '@lucide/svelte/icons/copy';
	import Mail from '@lucide/svelte/icons/mail';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
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
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-8 md:py-12">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'checkout', href: '/checkout' },
				{ label: 'confirmation' }
			]}
		/>

		<div class="mt-8 text-center">
			<div
				class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950"
			>
				<CircleCheck class="size-7 text-green-600 dark:text-green-400" aria-hidden="true" />
			</div>
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Payment successful</h1>
			<p class="mt-2 text-sm text-muted-foreground">Your order has been placed successfully.</p>
		</div>

		<div class="mt-8 space-y-4">
			<section class="rounded-lg border border-border bg-card p-5">
				<h2 class="text-sm font-medium text-foreground">Transaction details</h2>

				<dl class="mt-4 space-y-4 text-sm">
					<div class="flex items-center justify-between gap-4 border-b border-border pb-4">
						<dt class="text-muted-foreground">Order ID</dt>
						<dd>
							<button
								type="button"
								class="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-foreground/80"
								onclick={() => copyToClipboard(page.params.cart_id ?? '', 'Order ID')}
							>
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
								onclick={() => copyToClipboard(page.params.payment_id ?? '', 'Payment ID')}
							>
								#{page.params.payment_id}
								<Copy class="size-3.5 text-muted-foreground" aria-hidden="true" />
							</button>
						</dd>
					</div>
				</dl>

				<p class="mt-4 text-sm text-muted-foreground">
					Order tracking details will be shared on your registered mobile number and email address.
				</p>
			</section>

			<section class="rounded-lg border border-border bg-card p-5">
				<div class="flex items-center gap-2">
					<HelpCircle class="size-4 text-foreground" aria-hidden="true" />
					<h2 class="text-sm font-medium text-foreground">Need help?</h2>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">
					You can take a screenshot of this page for your reference. If you have any questions, our
					support team is here to help.
				</p>
				<div class="mt-4">
					<ScButton
						href="mailto:support@selfcrafted.in"
						target="_blank"
						rel="noopener noreferrer"
						variant="secondary"
						class="w-full justify-center"
					>
						<Mail class="mr-2 inline size-4" aria-hidden="true" />
						Contact support
					</ScButton>
				</div>
			</section>

			<div class="flex flex-wrap justify-center gap-3 pt-2">
				<ScButton href="/user/profile/orders" variant="secondary">View orders</ScButton>
				<ScButton href="/crafts" arrow>Browse crafts</ScButton>
			</div>
		</div>
	</div>
</div>
