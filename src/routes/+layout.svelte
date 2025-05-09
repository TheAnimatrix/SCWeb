<script lang="ts">
	import { run } from 'svelte/legacy';
	import { type CartG, initCartG, getActiveCart } from '$lib/client/cart';
	import './styles.css';
	import { navigating } from '$app/stores';
	import { loading, setLoading } from '$lib/client/loading';
	import { page } from '$app/stores';
	import { goto, invalidate, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import Logo from '$lib/svg/logo_main.svg';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import '../app.css';
	import { get, writable, type Writable } from 'svelte/store';
	import { onMount, setContext, getContext } from 'svelte';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import Toast from '$lib/components/common/Toast.svelte'; // Import custom Toast

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Maintain primary colors for different sections but simplify
	let primaryColor: string = $state('');
	let accentColor = 'accent'; // Use the lime green accent as the primary accent
	let filter: string = $state('');

	let pageName: string = $state('');
	run(() => {
		if ($page.route.id?.startsWith('/user')) {
			primaryColor = 'scoranged1';
			filter = 'filter-green';
			pageName = 'user';
		} else if ($page.route.id?.startsWith('/about') || $page.route.id?.startsWith('/policy')) {
			primaryColor = 'sccyand1';
			filter = 'filter-green';
			pageName = 'about';
		} else if ($page.route.id?.startsWith('/crafting')) {
			primaryColor = 'scredd1';
			filter = 'filter-green';
			pageName = 'crafting';
		} else if ($page.route.id?.startsWith('/3dp-portal')) {
			primaryColor = 'scblued1';
			filter = 'filter-green';
			pageName = 'about';
		} else if ($page.route.id?.startsWith('/(cart)')) {
			primaryColor = 'scblued1';
			filter = 'filter-green';
			pageName = 'cart';
		} else {
			primaryColor = 'scgreen';
			filter = 'filter-green';
			pageName = 'main';
		}
	});

	let userRoute: string = $state('/user/sign');

	let { data, children } = $props();

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

		const data1 = data.supabase_lt.auth.onAuthStateChange(async (event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
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
		return () => data1.data.subscription.unsubscribe();
	});

	// Function to reset scroll position
	function resetScroll() {
		if (!browser) return; // Only run in browser environment

		// Scroll body to top
		document.body.scrollTop = 0;
		document.documentElement.scrollTop = 0; // For Safari
	}

	// Add afterNavigate handler for scroll reset
	afterNavigate(({ from, to }) => {
		if (!browser) return; // Only run in browser environment

		// Only reset if we're navigating to a different path
		if (!from || from.route.id !== to?.route.id) {
			// Force scroll body to top
			document.body.scrollTop = 0;
			document.documentElement.scrollTop = 0; // For Safari
		}
	});
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white w-full max-w-full overflow-x-hidden">
	<!-- Loading Overlay -->
	<div
		class="h-screen bg-[rgba(0,0,0,0.8)] z-50 inset-0 fixed justify-center flex flex-col items-center pointer-events-auto"
		class:hidden={!$navigating && !$load_store}>
		<Loader />
		<div class="text-white text-center text-xl mt-4 mx-auto">Loading</div>
	</div>

	<!-- Background Elements -->
	<div class="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('/images/noise.png')]">
	</div>
	<div
		class="absolute top-20 z-0 left-1/2 w-96 h-96 bg-accent opacity-10 blur-[120px] -translate-x-1/2 rounded-full pointer-events-none">
	</div>

	<!-- Desktop Navbar -->
	<header
		class="fixed top-0 left-0 right-0 z-40 backdrop-blur-lg border-b border-[#252525]/30 w-full">
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
						class="px-4 py-2 rounded-lg transition-all {$page.route.id === '/'
							? 'bg-accent text-black font-medium'
							: 'text-gray-300 hover:bg-[#151515]'}">
						Crafts
					</a>
					<a
						href="/about"
						class="px-4 py-2 rounded-lg transition-all {$page.route.id?.startsWith('/about')
							? 'bg-accent text-black font-medium'
							: 'text-gray-300 hover:bg-[#151515]'}">
						About
					</a>
					<a
						href="/crafting"
						class="px-4 py-2 rounded-lg transition-all {$page.route.id?.startsWith('/crafting')
							? 'bg-accent text-black font-medium'
							: 'text-gray-300 hover:bg-[#151515]'}">
						Start Crafting
					</a>
					<a
						href="/3dp-portal"
						class="px-4 py-2 rounded-lg transition-all {$page.route.id?.startsWith('/3dp-portal')
							? 'bg-accent text-black font-medium'
							: 'text-gray-300 hover:bg-[#151515]'}">
						3DP Portal
					</a>
				</div>

				<!-- Action Buttons for both Desktop & Mobile -->
				<div class="flex items-center space-x-3">
					<a
						href={userRoute}
						class="p-2 rounded-lg transition-all {$page.route.id?.startsWith('/user')
							? 'bg-accent text-black'
							: 'text-gray-300 hover:bg-[#151515]'}">
						<Icon icon="ph:user-focus-duotone" class="text-2xl" />
					</a>

					<a
						href="/cart"
						class="flex items-center space-x-1 p-2 rounded-lg transition-all {$page.route.id?.startsWith(
							'/(cart)'
						)
							? 'bg-accent text-black'
							: 'text-gray-300 hover:bg-[#151515]'}">
						<Icon
							icon={$cart_store.itemCount > 0
								? 'solar:cart-large-minimalistic-bold-duotone'
								: 'solar:cart-large-minimalistic-broken'}
							class="text-2xl" />
						{#if $cart_store.itemCount > 0}
							<span
								class="inline-flex items-center justify-center w-5 h-5 bg-white text-black text-xs font-bold rounded-full">
								{$cart_store.itemCount}
							</span>
						{/if}
					</a>

					<!-- Mobile Menu Button -->
					<div class="md:hidden h-full">
						<button
							onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
							class="p-2 text-gray-300 hover:bg-[#151515] rounded-lg transition-all">
							<Icon icon="mdi:menu" class="text-2xl" />
						</button>

						
					</div>
				</div>
			</nav>
		</div>
	</header>

	<!-- Main Content -->
	<main class="pt-16 md:pt-20">
		{@render children?.()}
	</main>

	<div class="md:hidden absolute inset-0 h-full w-full {mobileMenuOpen ? 'block' : 'hidden'}">
		<div class="relative w-full h-full">
			<div class="md:hidden absolute inset-0 h-full w-full bg-black/10 backdrop-blur-sm z-[50] {mobileMenuOpen ? 'block' : 'hidden'}"></div>
			<div class="h-full w-full">
				<Drawer.Root bind:open={mobileMenuOpen}>
					<Drawer.Trigger style="display:none" />
					<Drawer.Content class="max-w-3xl mx-auto h-[75%] sm:h-[80%] transition-all duration-200 border border-[#252525]/30 rounded-t-2xl shadow-xl">
						<div class="p-6 h-full w-full overflow-y-auto flex flex-col">
							<div class="flex justify-between items-center mb-6">
								<div class="text-xl font-medium text-accent flex items-center">
									<Icon icon="ph:list-bold" class="mr-2 text-2xl" />
									<span>Navigation</span>
								</div>
								<button
									onclick={() => (mobileMenuOpen = false)}
									class="p-2 text-gray-300 hover:bg-[#151515] rounded-lg transition-all">
									<Icon icon="mdi:close" class="text-xl" />
								</button>
							</div>
							<nav class="flex flex-col space-y-3">
								<button
									onclick={() => {
										goto('/');
										mobileMenuOpen = false;
									}}
									class="text-left px-4 py-3 rounded-lg transition-all w-full flex items-center {$page.route.id === '/'
										? 'bg-accent/10 border-1 border-accent font-medium'
										: 'text-gray-300 hover:bg-[#151515]/50'}">
									<Icon icon="ph:stack-duotone" class="mr-3 text-xl {$page.route.id === '/' ? 'text-accent' : ''}" />
									<span>Crafts</span>
								</button>
								<button
									onclick={() => {
										goto('/about');
										mobileMenuOpen = false;
									}}
									class="text-left px-4 py-3 rounded-lg transition-all w-full flex items-center {$page.route.id?.startsWith(
										'/about'
									)
										? 'bg-accent/10 border-1 border-accent font-medium'
										: 'text-gray-300 hover:bg-[#151515]/50'}">
									<Icon icon="ph:info-duotone" class="mr-3 text-xl {$page.route.id?.startsWith('/about') ? 'text-accent' : ''}" />
									<span>About</span>
								</button>
								<button
									onclick={() => {
										goto('/crafting');
										mobileMenuOpen = false;
									}}
									class="text-left px-4 py-3 rounded-lg transition-all w-full flex items-center {$page.route.id?.startsWith(
										'/crafting'
									)
										? 'bg-accent/10 border-1 border-accent font-medium'
										: 'text-gray-300 hover:bg-[#151515]/50'}">
									<Icon icon="ph:hammer-duotone" class="mr-3 text-xl {$page.route.id?.startsWith('/crafting') ? 'text-accent' : ''}" />
									<span>Start Crafting</span>
								</button>
								<button
									onclick={() => {
										goto('/3dp-portal');
										mobileMenuOpen = false;
									}}
									class="text-left px-4 py-3 rounded-lg transition-all w-full flex items-center {$page.route.id?.startsWith(
										'/3dp-portal'
									)
										? 'bg-accent/10 border-1 border-accent font-medium'
										: 'text-gray-300 hover:bg-[#151515]/50'}">
									<Icon icon="ph:cube-duotone" class="mr-3 text-xl {$page.route.id?.startsWith('/3dp-portal') ? 'text-accent' : ''}" />
									<span>3DP Portal</span>
								</button>
							</nav>
							<div class="mt-auto pt-6 border-t border-[#252525]/50 mt-6">
								<div class="flex justify-center space-x-4 text-gray-400">
									<a
										href="https://discord.gg/UQ74TQfMqM"
										target="_blank"
										rel="noopener noreferrer"
										class="p-2 hover:text-accent transition-colors">
										<Icon icon="ph:discord-logo-duotone" class="text-2xl" />
									</a>
									<a
										href="https://github.com/TheAnimatrix/SCWeb"
										target="_blank"
										rel="noopener noreferrer"
										class="p-2 hover:text-accent transition-colors">
										<Icon icon="ph:github-logo-duotone" class="text-2xl" />
									</a>
								</div>
							</div>
						</div>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</div>
		
	</div>

	<!-- Footer -->
	<footer
		class="mt-32 border-t border-[#252525]/50 pt-16 pb-8 px-4 w-full max-w-full overflow-hidden">
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
							class="hover:text-accent transition-colors">
							<Icon icon="ph:discord-logo-duotone" class="text-2xl" />
						</a>
						<a
							href="https://github.com/TheAnimatrix/SCWeb"
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-accent transition-colors">
							<Icon icon="ph:github-logo-duotone" class="text-2xl" />
						</a>
					</div>
				</div>

				<!-- Links Column 1 -->
				<div>
					<div class="text-lg font-medium mb-4">Policies</div>
					<ul class="space-y-2 text-gray-400">
						<li>
							<a href="/policy#privacy" class="hover:text-accent transition-colors"
								>Privacy Policy</a>
						</li>
						<li>
							<a href="/policy#terms" class="hover:text-accent transition-colors"
								>Terms & Conditions</a>
						</li>
						<li>
							<a href="/policy#shipping" class="hover:text-accent transition-colors"
								>Shipping & Delivery</a>
						</li>
					</ul>
				</div>

				<!-- Links Column 2 -->
				<div>
					<div class="text-lg font-medium mb-4">Support</div>
					<ul class="space-y-2 text-gray-400">
						<li>
							<a href="/policy#cancellation" class="hover:text-accent transition-colors"
								>Cancellation & Refund</a>
						</li>
						<li>
							<a href="/policy#contact" class="hover:text-accent transition-colors">Contact Us</a>
						</li>
					</ul>
				</div>
			</div>

			<div class="text-center text-gray-500 text-sm">
				<p>Selfcrafted © 2025</p>
				<p class="mt-2">Made with ❤️ by The Animatrix</p>
			</div>
		</div>
	</footer>

	<!-- Custom Toast Component -->
	<Toast />
</div>

<style>
	.filter-green {
		filter: hue-rotate(65deg) saturate(2);
	}

	.filter-purple {
		filter: hue-rotate(58deg);
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

	.filter-3dp {
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
