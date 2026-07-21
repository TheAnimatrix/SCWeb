<script lang="ts">
	import { page } from '$app/state';
	import { Breadcrumbs } from '$lib/components/shell';
	import TabPanelTransition from '$lib/components/ui/TabPanelTransition.svelte';
	import { cn } from '$lib/utils';

	let { children } = $props();

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
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-6 md:py-8">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'profile', href: '/user/profile/account' },
				{ label: activeLabel }
			]} />

		<div class="mt-4 flex items-baseline justify-between gap-4">
			<h1 class="text-2xl font-semibold tracking-tight">Profile</h1>
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
