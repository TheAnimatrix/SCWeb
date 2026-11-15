<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

					import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton } from '$lib/components/sc';
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
				<Icon icon={F.dismissCircle} class="size-7 text-red-600 dark:text-red-400" aria-hidden="true" />
			</div>
			<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Payment unsuccessful</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				The payment did not go through. Your cart is saved.
			</p>
		</div>

		<div class="mt-8 space-y-4">
			<section class="rounded-lg border border-border bg-card p-5">
				<div class="flex items-center gap-2">
					<Icon icon={F.questionCircle} class="size-4 text-foreground" aria-hidden="true" />
					<h2 class="text-sm font-medium text-foreground">Was money taken?</h2>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">
					If money left your account, your bank normally reverses it within 5 to 7 working days. If
					it doesn't, write to support@selfcrafted.in.
				</p>
				<div class="mt-4">
					<ScButton
						href="mailto:support@selfcrafted.in?subject=Failed%20payment"
						variant="secondary"
						class="w-full justify-center">
						<Icon icon={F.mail} class="mr-2 inline size-4" aria-hidden="true" />
						Email support
					</ScButton>
				</div>
			</section>

			<div class="flex flex-wrap justify-center gap-3 pt-2">
				<ScButton href="/checkout" arrow>Try payment again</ScButton>
				<ScButton href="/cart" variant="ghost">Return to cart</ScButton>
			</div>
		</div>
	</div>
</div>
