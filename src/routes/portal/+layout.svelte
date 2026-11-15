<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';

	let { data, children } = $props();

	const nav = $derived([
		{ href: '/portal', label: 'Dashboard', exact: true },
		{ href: '/portal/storefront', label: 'Shop page' },
		...(data.maker.capabilities?.includes('physical_goods')
			? [{ href: '/portal/listings', label: 'Listings' }]
			: []),
		...(data.maker.capabilities?.includes('printing_3d')
			? [{ href: '/portal/printing', label: 'Printing' }]
			: []),
		{ href: '/portal/settings', label: 'Settings' }
	]);

	const path = $derived(page.url.pathname);
	const storeHref = $derived(data.maker.username ? makerStorefrontPath(data.maker.username) : null);
	const storeLive = $derived(data.maker.storefront_state === 'live');

	function isActive(item: { href: string; exact?: boolean }) {
		return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + '/');
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<header class="border-b border-border">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
			<div>
				<h1 class="text-xl font-semibold">Maker portal</h1>
				<p class="text-sm text-muted-foreground">
					{data.maker.display_name || data.maker.username || 'Maker'}
				</p>
			</div>
			{#if storeHref && storeLive}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- dynamic shop path -->
				<a href={storeHref} class="text-sm underline">View your shop</a>
			{:else if !storeLive}
				<p class="text-sm text-muted-foreground">
					Your shop page is hidden from buyers.
					<a href={resolve('/portal/storefront')} class="underline"
						>Publish it on the Shop page tab</a>
				</p>
			{/if}
		</div>
		<nav class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Portal">
			{#each nav as item (item.href)}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- static portal tab paths -->
				<a
					href={item.href}
					aria-current={isActive(item) ? 'page' : undefined}
					class={cn(
						'whitespace-nowrap border-b-2 px-3 py-2 text-sm',
						isActive(item)
							? 'border-foreground font-medium text-foreground'
							: 'border-transparent text-muted-foreground hover:text-foreground'
					)}>
					{item.label}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/each}
		</nav>
	</header>
	<main class="mx-auto max-w-6xl px-4 py-8">
		{@render children?.()}
	</main>
</div>
