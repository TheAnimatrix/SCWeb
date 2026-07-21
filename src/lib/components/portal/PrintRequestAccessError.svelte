<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { page } from '$app/state';
	import PortalCard from './PortalCard.svelte';
	import { ScButton, TagBadge } from '$lib/components/sc';

	type Portal = 'maker' | 'user';

	interface Props {
		portal?: Portal;
	}

	let { portal = 'maker' }: Props = $props();

	const status = $derived(page.status);
	const message = $derived(page.error?.message);
	const signInHref = $derived(`/user/sign?postLogin=${encodeURIComponent(page.url.pathname)}`);

	const copy = $derived.by(() => {
		const accountLabel = portal === 'maker' ? 'maker' : 'customer';
		const portalHref = portal === 'maker' ? '/3dp-portal/maker#orderManagement' : '/3dp-portal/user';
		const portalCta = portal === 'maker' ? 'Back to maker portal' : 'Back to user portal';
		const ordersCta = portal === 'maker' ? 'Back to your orders' : 'Back to your requests';

		if (status === 401) {
			return {
				badge: 'sign_in_required',
				icon: F.signIn,
				title: 'Sign in to view this order',
				body:
					message ??
					`Sign in with the ${accountLabel} account linked to this order to view its details.`,
				primary: { label: 'Sign in', href: signInHref },
				secondary: { label: portalCta, href: portalHref }
			};
		}

		if (status === 403) {
			return {
				badge: 'access_denied',
				icon: F.lock,
				title: "This isn't for your eyes",
				body:
					message ??
					(portal === 'maker'
						? 'This print request belongs to another maker. You can only view orders assigned to your account.'
						: 'This print request belongs to another customer. You can only view orders on your account.'),
				primary: { label: ordersCta, href: portalHref },
				secondary: null
			};
		}

		if (status === 404) {
			return {
				badge: 'not_found',
				icon: F.warning,
				title: 'Print request not found',
				body:
					message ??
					'This order may have been removed, or the link might be incorrect. Check your portal for active requests.',
				primary: { label: portalCta, href: portalHref },
				secondary: null
			};
		}

		return {
			badge: 'error',
			icon: F.warning,
			title: 'Something went wrong',
			body: message ?? 'We could not load this print request. Please try again.',
			primary: { label: portalCta, href: portalHref },
			secondary: null
		};
	});
</script>

<div class="mx-auto max-w-7xl px-4 pb-16 pt-4">
	<PortalCard class="mx-auto max-w-lg py-12 text-center">
		<TagBadge label={copy.badge} class="mb-4" />
		<div
			class="mx-auto mb-4 flex size-12 items-center justify-center rounded-md border border-border bg-muted/40">
			<Icon icon={copy.icon} class="size-5 text-muted-foreground" />
		</div>
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
			{copy.body}
		</p>
		<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
			<ScButton href={copy.primary.href}>{copy.primary.label}</ScButton>
			{#if copy.secondary}
				<ScButton variant="secondary" href={copy.secondary.href}>{copy.secondary.label}</ScButton>
			{/if}
		</div>
	</PortalCard>
</div>
