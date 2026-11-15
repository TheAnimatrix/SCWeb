<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { page } from '$app/state';
	import TabPanelTransition from '$lib/components/ui/TabPanelTransition.svelte';
	import { cn } from '$lib/utils';

	let { children, data } = $props();

	let rawRoute = $derived(page.route.id?.split('3dp-portal')[1]);
	let activeRoute = $derived(
		rawRoute?.includes('user') ? '/user' : rawRoute?.includes('maker') ? '/maker' : rawRoute
	);

	const signedIn = $derived(Boolean(data.session?.user));

	function signInHref(target: string) {
		return `/user/sign?postLogin=${encodeURIComponent(target)}`;
	}

	// "For makers" goes to the maker portal's printing page; /portal sends people who
	// aren't makers yet to the maker application.
	const navItems = $derived([
		{ key: '', href: '/3dp-portal', label: 'Get a print', icon: F.box },
		{
			key: '/user',
			href: signedIn ? '/3dp-portal/user' : signInHref('/3dp-portal/user'),
			label: 'My print requests',
			icon: F.person
		},
		{
			key: '/maker',
			href: signedIn ? '/portal/printing' : signInHref('/portal/printing'),
			label: 'For makers',
			icon: F.print
		}
	]);
</script>

<div class="w-full bg-background pt-6 text-foreground">
	<nav
		class="mx-auto mb-6 flex max-w-7xl flex-wrap justify-center gap-2 border-b border-border px-4 pb-6"
		aria-label="3D printing">
		{#each navItems as { key, href, label, icon } (key)}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- hrefs are fixed paths, some with a postLogin query -->
			<a
				{href}
				aria-current={activeRoute === key ? 'page' : undefined}
				class={cn(
					'flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
					activeRoute === key
						? 'border-primary bg-primary text-primary-foreground shadow-sm'
						: 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
				)}>
				<Icon {icon} class="size-4" aria-hidden="true" />
				<span>{label}</span>
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
	</nav>

	<div class="mx-auto">
		<TabPanelTransition tabKey={activeRoute ?? ''}>
			{@render children()}
		</TabPanelTransition>
	</div>
</div>
