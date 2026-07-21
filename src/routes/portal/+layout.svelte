<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';

	let { data, children } = $props();

	const nav = $derived([
		{ href: '/portal', label: 'Dashboard', exact: true },
		{ href: '/portal/storefront', label: 'Storefront' },
		...(data.maker.capabilities?.includes('physical_goods')
			? [{ href: '/portal/listings', label: 'Listings' }]
			: []),
		...(data.maker.capabilities?.includes('printing_3d')
			? [{ href: '/portal/printing', label: 'Printing' }]
			: []),
		{ href: '/portal/settings', label: 'Settings' }
	]);

	const path = $derived(page.url.pathname);
	const storeHref = $derived(
		data.maker.username ? makerStorefrontPath(data.maker.username) : null
	);
</script>

<div class="min-h-screen bg-background text-foreground">
	<header class="border-b border-border">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
			<div>
				<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Maker portal</p>
				<h1 class="text-lg font-semibold">
					{data.maker.display_name || data.maker.username || 'Maker'}
				</h1>
			</div>
			{#if storeHref}
				<a href={storeHref} class="text-sm underline">View storefront</a>
			{/if}
		</div>
		<nav class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Portal">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class={cn(
						'whitespace-nowrap border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wide',
						(item.exact ? path === item.href : path === item.href || path.startsWith(item.href + '/'))
							? 'border-foreground text-foreground'
							: 'border-transparent text-muted-foreground hover:text-foreground'
					)}>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>
	<main class="mx-auto max-w-6xl px-4 py-8">
		{@render children?.()}
	</main>
</div>
