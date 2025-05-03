<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	// Determine the active sub-route
	function getLastSegment(path: string) {
		const segments = path.split('/');
		return segments[segments.length - 1];
	}

	let activeRoute = $derived(getLastSegment($page.route.id ?? ''));

	const navItems = [
		{ href: 'user', label: 'User portal', icon: 'ph:user-circle-bold' },
		{ href: 'maker', label: 'Maker portal', icon: 'ph:printer-bold' }
	];

	// Get the children snippet to render
	let { children } = $props();
</script>

<div class="w-full">
	<!-- Navigation resembling tabs -->
	<div class="flex flex-wrap justify-center gap-3 mb-8">
		{#each navItems as { href, label, icon }}
			<a
				href="/user/profile/3dp-manager/{href}"
				class="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 {activeRoute === href
					? 'bg-accent/10 text-accent'
					: 'bg-[#151515]/40 text-gray-400 hover:bg-[#252525]/60'}"
			>
				<Icon {icon} class="text-lg" />
				<span>{label}</span>
			</a>
		{/each}
	</div>

	<!-- Render the active sub-route's content -->
	<div class="mt-6">
		{@render children()}
	</div>
</div>