<script lang="ts">
	import { page } from '$app/state';
	import { Breadcrumbs } from '$lib/components/shell';
	import TabPanelTransition from '$lib/components/ui/TabPanelTransition.svelte';
	import { cn } from '$lib/utils';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';

	let { data, children } = $props();

	const navItems = [
		{ href: '/user/profile/account', label: 'account' },
		{ href: '/user/profile/orders', label: 'orders' },
		{ href: '/user/profile/addresses', label: 'addresses' },
		{ href: '/user/profile/crafts', label: 'crafts' }
	];

	const activePath = $derived(page.url.pathname);

	const activeLabel = $derived(
		navItems.find((item) => activePath === item.href || activePath.startsWith(item.href + '/'))
			?.label ?? 'profile'
	);

	const maker = $derived(data.maker);
	const makerStatus = $derived(maker?.approved_state ?? null);
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-6 md:py-8">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'profile', href: '/user/profile/account' },
				{ label: activeLabel }
			]} />

		<div class="mt-4 flex flex-wrap items-baseline justify-between gap-4">
			<h1 class="text-2xl font-semibold tracking-tight">Profile</h1>
		</div>

		<div class="mt-4 rounded-md border border-border bg-muted/20 p-4">
			<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Maker status</p>
			{#if makerStatus === 'approved'}
				<p class="mt-1 text-sm">You’re an approved maker.</p>
				<div class="mt-3 flex flex-wrap gap-3 text-sm">
					<a href="/portal" class="underline">Open portal</a>
					{#if maker?.username}
						<a href={makerStorefrontPath(maker.username)} class="underline">View storefront</a>
					{/if}
				</div>
			{:else if makerStatus === 'pending'}
				<p class="mt-1 text-sm">Your maker application is pending review.</p>
			{:else if makerStatus === 'rejected'}
				<p class="mt-1 text-sm">Your previous application was rejected.</p>
				<a href="/maker/apply?source=profile" class="mt-3 inline-block text-sm underline"
					>Apply again</a
				>
			{:else}
				<p class="mt-1 text-sm">Sell products or offer printing on Selfcrafted.</p>
				<a href="/maker/apply?source=profile" class="mt-3 inline-block text-sm underline"
					>Apply to become a maker</a
				>
			{/if}
		</div>

		<nav
			aria-label="Profile sections"
			class="mt-4 flex gap-1 overflow-x-auto border-b border-border">
			{#each navItems as { href, label } (href)}
				<a
					{href}
					class={cn(
						'whitespace-nowrap border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors',
						activePath === href
							? 'border-foreground text-foreground'
							: 'border-transparent text-muted-foreground hover:text-foreground'
					)}>
					{label}
				</a>
			{/each}
		</nav>

		<div class="mt-6">
			<TabPanelTransition tabKey={activePath}>
				{@render children?.()}
			</TabPanelTransition>
		</div>
	</div>
</div>
