<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
				import TabPanelTransition from '$lib/components/ui/TabPanelTransition.svelte';
	import { cn } from '$lib/utils';

	let rawRoute = $derived(page.route.id?.split('3dp-portal')[1]);
	let activeRoute = $derived(
		rawRoute?.includes('user') ? '/user' : rawRoute?.includes('maker') ? '/maker' : rawRoute
	);

	const navItems = [
		{ href: '', label: 'Fabbly', icon: F.box },
		{ href: '/user', label: 'User portal', icon: F.person },
		{ href: '/maker', label: 'Maker portal', icon: F.print }
	];

	let { children, data } = $props();
</script>

<div class="w-full bg-background pt-6 text-foreground">
	<nav
		class="mx-auto mb-6 flex max-w-7xl flex-wrap justify-center gap-2 border-b border-border px-4 pb-6"
		aria-label="Portal navigation">
		{#each navItems as { href, label, icon } (href)}
			<button
				type="button"
				onclick={() => {
					if ((href == '/user' || href == '/maker') && !data.session?.user) {
						goto('/user/sign?postLogin=/3dp-portal' + href);
					} else {
						goto('/3dp-portal' + href);
					}
				}}
				class={cn(
					'flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
					activeRoute === href
						? 'border-black bg-black text-white shadow-sm'
						: 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
				)}>
				<Icon {icon} class="size-4" />
				<span>{label}</span>
			</button>
		{/each}
	</nav>

	<div class="mx-auto">
		<TabPanelTransition tabKey={activeRoute ?? ''}>
			{@render children()}
		</TabPanelTransition>
	</div>
</div>
