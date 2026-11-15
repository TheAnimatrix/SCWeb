<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { page } from '$app/state';
	import PortalCard from './PortalCard.svelte';
	import { ScButton } from '$lib/components/sc';

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
		const portalHref = portal === 'maker' ? '/portal/printing#orderManagement' : '/3dp-portal/user';
		const portalCta = portal === 'maker' ? 'Print requests' : 'My print requests';
		const ordersCta = portalCta;

		if (status === 401) {
			return {
				icon: F.signIn,
				title: 'Sign in to view this request',
				body: message ?? `Sign in with the ${accountLabel} account linked to this request.`,
				primary: { label: 'Sign in', href: signInHref },
				secondary: { label: portalCta, href: portalHref }
			};
		}

		if (status === 403) {
			return {
				icon: F.lock,
				title: "You don't have access to this request",
				body:
					message ??
					(portal === 'maker'
						? 'This request was sent to a different maker. Sign in with the account it was sent to.'
						: 'This request belongs to a different account. Sign in with the account that placed it.'),
				primary: { label: ordersCta, href: portalHref },
				secondary: null
			};
		}

		if (status === 404) {
			return {
				icon: F.warning,
				title: 'Print request not found',
				body: message ?? 'It may have been removed, or the link may be wrong.',
				primary: { label: portalCta, href: portalHref },
				secondary: null
			};
		}

		return {
			icon: F.warning,
			title: "Couldn't load this request",
			body: message ?? 'Refresh the page to try again.',
			primary: { label: portalCta, href: portalHref },
			secondary: null
		};
	});
</script>

<div class="mx-auto max-w-7xl px-4 pb-16 pt-4">
	<PortalCard class="mx-auto max-w-lg py-12 text-center">
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
