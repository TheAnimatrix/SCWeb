<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { page } from '$app/state';
	import { PortalCard } from '$lib/components/portal';
	import { ScButton, TagBadge } from '$lib/components/sc';

	const status = $derived(page.status);
	const message = $derived(page.error?.message);

	const copy = $derived.by(() => {
		if (status === 403) {
			return {
				badge: 'access_denied',
				title: "This isn't for your eyes",
				body:
					message ??
					'This print request belongs to another maker. You can only view orders assigned to your account.',
				cta: 'Back to your orders'
			};
		}

		if (status === 404) {
			return {
				badge: 'not_found',
				title: 'Print request not found',
				body:
					message ??
					'This order may have been removed, or the link might be incorrect. Check your maker portal for active requests.',
				cta: 'Back to maker portal'
			};
		}

		return {
			badge: 'error',
			title: 'Something went wrong',
			body: message ?? 'We could not load this print request. Please try again.',
			cta: 'Back to maker portal'
		};
	});
</script>

<div class="mx-auto max-w-7xl px-4 pb-16 pt-4">
	<PortalCard class="mx-auto max-w-lg py-12 text-center">
		<TagBadge label={copy.badge} class="mb-4" />
		<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-md border border-border bg-muted/40">
			<Icon
				icon={status === 403 ? F.lock : F.warning}
				class="size-5 text-muted-foreground" />
		</div>
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
			{copy.body}
		</p>
		<div class="mt-6">
			<ScButton href="/3dp-portal/maker#orderManagement">{copy.cta}</ScButton>
		</div>
	</PortalCard>
</div>
