<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let activeRoute = $derived(page.route.id?.split('3dp-portal')[1]);

	$effect(() => {
		if (activeRoute?.includes('user')) {
			activeRoute = '/user';
		}
		if (activeRoute?.includes('maker')) {
			activeRoute = '/maker';
		}
	});

	const navItems = [
		{ href: '', label: 'FABBLY', icon: 'mingcute:cube-fill' },
		{ href: '/user', label: 'User portal', icon: 'ph:user-circle-bold' },
		{ href: '/maker', label: 'Maker portal', icon: 'ph:printer-bold' }
	];

	// Get the children snippet to render
	let { children, data } = $props();
</script>

<div class="w-full pt-12">
	<!-- Navigation resembling tabs -->
	<div class="flex flex-wrap justify-center gap-3 mb-8">
		{#each navItems as { href, label, icon }}
			<button
				onclick={() => {
					if ((href == '/user' || href == '/maker') && !data.session?.user) {
						goto('/user/sign?postLogin=/3dp-portal' + href);
					} else {
						goto('/3dp-portal' + href);
					}
				}}
				class="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 {activeRoute ===
				href
					? 'bg-accent/10 text-accent'
					: 'bg-[#151515]/40 text-gray-400 hover:bg-[#252525]/60'}">
				<Icon {icon} class="text-lg" />
				<span class="font-bold text-sm">{label}</span>
			</button>
		{/each}
	</div>

	<!-- Render the active sub-route's content -->
	<div class="mt-6 mx-auto">
		{@render children()}
	</div>
</div>

<style>
	/* Gradient background effects */
	.gradient-background {
		background: linear-gradient(to bottom right, #0a0a12, #0f0f1a, #0a0a12);
		position: relative;
		overflow: hidden;
		min-height: 100vh;
	}
</style>
