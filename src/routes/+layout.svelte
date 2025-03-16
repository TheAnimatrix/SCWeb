<script lang="ts">
	import { type CartG, initCartG, getActiveCart } from '$lib/client/cart';
	import './styles.css';
	import { navigating } from '$app/stores';
	import { loading, setLoading } from '$lib/client/loading';
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import Logo from '$lib/svg/logo_main.svg';
	import Icon from '@iconify/svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Button } from '$lib/components/ui/button';
	import '../app.pcss';
	import { get, writable, type Writable } from 'svelte/store';
	import { onMount, setContext, getContext } from 'svelte';
	import Loader from '$lib/components/fundamental/Loader.svelte';

	// Maintain primary colors for different sections but simplify
	let primaryColor: string;
	let accentColor = "#c2ff00"; // Use the lime green accent as the primary accent
	let filter: string;

	let pageName: string;
	$: {
		if ($page.route.id?.startsWith('/user')) {
			primaryColor = 'scoranged1';
			filter = 'filter-orange';
			pageName = 'user';
		} else if ($page.route.id?.startsWith('/about') || $page.route.id?.startsWith('/policy')) {
			primaryColor = 'sccyand1';
			filter = 'filter-about';
			pageName = 'about';
		} else if ($page.route.id?.startsWith('/crafting')) {
			primaryColor = 'scredd1';
			filter = 'filter-crafting';
			pageName = 'crafting';
		} else if ($page.route.id?.startsWith('/pif-portal')) {
			primaryColor = 'scblued1';
			filter = 'filter-pif';
			pageName = 'about';
		} else if ($page.route.id?.startsWith('/(cart)')) {
			primaryColor = 'scblued1';
			filter = 'filter-cart';
			pageName = 'cart';
		} else {
			primaryColor = 'scpurpled1';
			filter = 'filter-purple';
			pageName = 'main';
		}
	}

	let userRoute: string = '/user/sign';

	export let data;
	data.supabase_lt.auth.onAuthStateChange(async (event, session) => {
		if (event == 'SIGNED_IN') {
		}
		if (event === 'SIGNED_OUT') {
			//
			// delete cookies on sign out
			const expires = new Date(0).toUTCString();
			if (document) {
				// document.cookie = `my-access-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
				// document.cookie = `my-refresh-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
			}
			goto('/user/sign', { replaceState: true });
			userRoute = '/user/sign';
		} else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
			const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years, never expires
			if (document) {
				// document.cookie = `my-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
				// document.cookie = `my-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
			}
			if (event === 'SIGNED_IN' && $page.route.id == '/user/sign')
				goto('/user/profile/account', { replaceState: true });
			userRoute = '/user/profile/account';
		}
	});

	setContext('loading', writable(false));
	setContext('userCartStatus', initCartG());
	const load_store = getContext<Writable<boolean>>('loading');
	const cart_store = getContext<Writable<CartG>>('userCartStatus');

	onMount(() => {
		getActiveCart(data.supabase_lt, data.clientId).then((cart) => {
			if (!cart.error && cart.data) {
				let itemCount = 0;
				cart.data.list?.forEach((item) => {
					itemCount += item.qty;
				});
				cart_store.set({ itemCount: itemCount, valid: true });
			}
		});
	});
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white overflow-hidden">
	<!-- Loading Overlay -->
	<div
		class="h-screen bg-[rgba(0,0,0,0.8)] z-50 inset-0 fixed justify-center flex flex-col items-center"
		class:hidden={!$navigating && !$load_store}>
		<Loader />
		<div class="text-white text-center text-xl mt-4 mx-auto">Loading</div>
	</div>
	
	<!-- Background Elements -->
	<div class="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('/images/noise.png')]"></div>
	<div class="absolute top-20 left-1/2 w-96 h-96 bg-[#c2ff00] opacity-10 blur-[120px] -translate-x-1/2 rounded-full"></div>
	
	<!-- Desktop Navbar -->
	<header class="sticky top-0 z-40 backdrop-blur-lg border-b border-[#252525]/50">
		<div class="max-w-7xl mx-auto px-4">
			<nav class="flex items-center justify-between h-16 md:h-20">
				<!-- Logo -->
				<a href="/" class="flex items-center">
					<img class="{filter} h-8 md:h-10" src={Logo} alt="Selfcrafted Logo" />
				</a>
				
				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center space-x-1">
					<a 
						href="/" 
						class="px-4 py-2 rounded-lg transition-all {$page.route.id === '/' ? 'bg-[#c2ff00] text-black font-medium' : 'text-gray-300 hover:bg-[#151515]'}">
						Crafts
					</a>
					<a 
						href="/about" 
						class="px-4 py-2 rounded-lg transition-all {$page.route.id?.startsWith('/about') ? 'bg-[#c2ff00] text-black font-medium' : 'text-gray-300 hover:bg-[#151515]'}">
						About
					</a>
					<a 
						href="/crafting" 
						class="px-4 py-2 rounded-lg transition-all {$page.route.id?.startsWith('/crafting') ? 'bg-[#c2ff00] text-black font-medium' : 'text-gray-300 hover:bg-[#151515]'}">
						Start Crafting
					</a>
					<a 
						href="/pif-portal" 
						class="px-4 py-2 rounded-lg transition-all {$page.route.id?.startsWith('/pif-portal') ? 'bg-[#c2ff00] text-black font-medium' : 'text-gray-300 hover:bg-[#151515]'}">
						PIF Portal
					</a>
				</div>
				
				<!-- Action Buttons for both Desktop & Mobile -->
				<div class="flex items-center space-x-3">
					<a 
						href={userRoute}
						class="p-2 rounded-lg transition-all {$page.route.id?.startsWith('/user') ? 'bg-[#c2ff00] text-black' : 'text-gray-300 hover:bg-[#151515]'}"
					>
						<Icon icon="ph:user-focus-duotone" class="text-2xl" />
					</a>
					
					<a 
						href="/cart"
						class="flex items-center space-x-1 p-2 rounded-lg transition-all {$page.route.id?.startsWith('/(cart)') ? 'bg-[#c2ff00] text-black' : 'text-gray-300 hover:bg-[#151515]'}"
					>
						<Icon
							icon={$cart_store.itemCount > 0
								? 'solar:cart-large-minimalistic-bold-duotone'
								: 'solar:cart-large-minimalistic-broken'} 
							class="text-2xl" 
						/>
						{#if $cart_store.itemCount > 0}
							<span class="inline-flex items-center justify-center w-5 h-5 bg-white text-black text-xs font-bold rounded-full">
								{$cart_store.itemCount}
							</span>
						{/if}
					</a>
					
					<!-- Mobile Menu Button -->
					<div class="md:hidden">
						<Drawer.Root shouldScaleBackground>
							<Drawer.Trigger>
								<button class="p-2 text-gray-300 hover:bg-[#151515] rounded-lg transition-all">
									<Icon icon="mdi:menu" class="text-2xl" />
								</button>
							</Drawer.Trigger>
							<Drawer.Content class="bg-[#0c0c0c] border-t border-[#252525]">
								<div class="p-6">
									<div class="flex justify-between items-center mb-8">
										<h2 class="text-xl font-medium text-[#c2ff00]">Menu</h2>
										<Drawer.Close>
											<button class="p-2 text-gray-300 hover:bg-[#151515] rounded-lg">
												<Icon icon="mdi:close" class="text-xl" />
											</button>
										</Drawer.Close>
									</div>
									
									<nav class="flex flex-col space-y-4">
										<a 
											href="/" 
											class="px-4 py-3 rounded-lg transition-all {$page.route.id === '/' ? 'bg-[#151515] border-l-4 border-[#c2ff00] font-medium' : 'text-gray-300'}">
											Crafts
										</a>
										<a 
											href="/about" 
											class="px-4 py-3 rounded-lg transition-all {$page.route.id?.startsWith('/about') ? 'bg-[#151515] border-l-4 border-[#c2ff00] font-medium' : 'text-gray-300'}">
											About
										</a>
										<a 
											href="/crafting" 
											class="px-4 py-3 rounded-lg transition-all {$page.route.id?.startsWith('/crafting') ? 'bg-[#151515] border-l-4 border-[#c2ff00] font-medium' : 'text-gray-300'}">
											Start Crafting
										</a>
										<a 
											href="/pif-portal" 
											class="px-4 py-3 rounded-lg transition-all {$page.route.id?.startsWith('/pif-portal') ? 'bg-[#151515] border-l-4 border-[#c2ff00] font-medium' : 'text-gray-300'}">
											PIF Portal
										</a>
									</nav>
								</div>
							</Drawer.Content>
						</Drawer.Root>
					</div>
				</div>
			</nav>
		</div>
	</header>

	<!-- Main Content -->
	<main>
		<slot />
	</main>

	<!-- Footer -->
	<footer class="mt-32 border-t border-[#252525]/50 pt-16 pb-8 px-4">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
				<!-- Logo & Socials -->
				<div>
					<img class="{filter} h-10 mb-6" src={Logo} alt="Selfcrafted Logo" />
					<div class="flex space-x-4 text-gray-400">
						<a 
							href="https://discord.gg/UQ74TQfMqM" 
							target="_blank" 
							rel="noopener noreferrer"
							class="hover:text-[#c2ff00] transition-colors"
						>
							<Icon icon="ph:discord-logo-duotone" class="text-2xl" />
						</a>
						<a 
							href="https://github.com/TheAnimatrix/SCWeb" 
							target="_blank" 
							rel="noopener noreferrer"
							class="hover:text-[#c2ff00] transition-colors"
						>
							<Icon icon="ph:github-logo-duotone" class="text-2xl" />
						</a>
					</div>
				</div>
				
				<!-- Links Column 1 -->
				<div>
					<h3 class="text-lg font-medium mb-4">Policies</h3>
					<ul class="space-y-2 text-gray-400">
						<li><a href="/policy#privacy" class="hover:text-[#c2ff00] transition-colors">Privacy Policy</a></li>
						<li><a href="/policy#terms" class="hover:text-[#c2ff00] transition-colors">Terms & Conditions</a></li>
						<li><a href="/policy#shipping" class="hover:text-[#c2ff00] transition-colors">Shipping & Delivery</a></li>
					</ul>
				</div>
				
				<!-- Links Column 2 -->
				<div>
					<h3 class="text-lg font-medium mb-4">Support</h3>
					<ul class="space-y-2 text-gray-400">
						<li><a href="/policy#cancellation" class="hover:text-[#c2ff00] transition-colors">Cancellation & Refund</a></li>
						<li><a href="/policy#contact" class="hover:text-[#c2ff00] transition-colors">Contact Us</a></li>
					</ul>
				</div>
			</div>
			
			<div class="text-center text-gray-500 text-sm">
				<p>Selfcrafted © 2025</p>
				<p class="mt-2">Made with ❤️ by The Animatrix</p>
			</div>
		</div>
	</footer>
</div>

<style lang="postcss">
	.filter-purple {
		filter: hue-rotate(48deg);
	}

	.filter-orange {
		filter: hue-rotate(221deg);
	}

	.filter-about {
		filter: hue-rotate(0deg);
	}

	.filter-crafting {
		filter: hue-rotate(-168deg);
	}

	.filter-cart {
		filter: hue-rotate(52deg);
	}

	.filter-pif {
		filter: hue-rotate(65deg) saturate(1.2);
	}

	:global(body)::-webkit-scrollbar {
		width: 6px;
	}

	/* Track */
	:global(body)::-webkit-scrollbar-track {
		background: rgb(5, 5, 5);
	}

	/* Handle */
	:global(body)::-webkit-scrollbar-thumb {
		background-color: rgb(17, 17, 17);
		border-radius: 12px;
		transition: 0.4s linear ease-in;
	}

	/* Handle on hover */
	:global(body)::-webkit-scrollbar-thumb:hover {
		background-color: rgb(34, 34, 34);
		transition: 0.4s linear all;
	}
</style>
