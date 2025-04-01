<script lang="ts">
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import Icon from '@iconify/svelte';

	function getLastRoute(v: string | null) {
		if (!v) return 'Address';
		let x = v.split('/');
		return x[x.length - 1];
	}

	const navItems = [
		{ href: 'orders', label: 'Orders', icon: 'ph:shopping-bag-bold' },
		{ href: 'addresses', label: 'Address', icon: 'ph:map-pin-bold' },
		{ href: 'account', label: 'Account', icon: 'ph:user-bold' },
		{ href: 'crafts', label: 'Crafts', icon: 'ph:palette-bold' }
	];

	let { data, children } = $props();
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white py-12">
	<div class="container mx-auto px-4">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-3 h-3 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">Profile Settings</span>
			</div>
			<h1 class="text-4xl font-bold mb-3">Your Profile</h1>
			<p class="text-gray-400 max-w-2xl mx-auto">Manage your account settings, addresses, orders and crafts.</p>
		</div>

		<!-- Navigation -->
		<div class="flex flex-wrap justify-center gap-3 mb-12">
			{#each navItems as { href, label, icon }, i}
				<a
					{href}
					class="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 {
						getLastRoute(page.route.id) === href 
							? 'bg-accent/10 text-accent' 
							: 'bg-[#151515]/40 text-gray-400'
					}"
				>
					<Icon {icon} class="text-lg" />
					<span>{label}</span>
				</a>
			{/each}
		</div>

		<!-- Content -->
		{#key data.url}
			<div
				in:fly={{ y: 20, duration: 300, delay: 150 }}
				out:fly={{ y: -20, duration: 200 }}
				class="max-w-4xl mx-auto"
			>
				{@render children?.()}
			</div>
		{/key}
	</div>
</div>
