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

	let bgColor: string,
		accentColor: string,
		accentHoverColor: string,
		filter: string,
		primaryColor: string;

	let bgUser: string, bgAbout: string, bgMain: string, bgCrafting: string, bgCart: string;
	bgUser = 'bg-gradient-to-tr from-[#040201] to-[#1d140b]';
	bgAbout = 'bg-gradient-to-tr from-[#030606] to-[#0c1213]';
	bgCart = 'bg-gradient-to-tr from-scbluek1 to-scbluek2';
	bgMain = 'bg-gradient-to-tr from-scpurplek1 to-scpurplek2';
	bgCrafting = 'bg-gradient-to-tr from-[#050000] to-[#1c0808]';
	let pageName: string;
	$: {
		if ($page.route.id?.startsWith('/user')) {
			primaryColor = 'scoranged1';
			accentColor = 'scorange';
			bgColor = bgUser;
			filter = 'filter-orange';
			pageName = 'user';
		} else if ($page.route.id?.startsWith('/about') || $page.route.id?.startsWith('/policy')) {
			primaryColor = 'sccyand1';
			accentColor = 'sccyan';
			bgColor = bgAbout;
			filter = 'filter-about';
			pageName = 'about';
		} else if ($page.route.id?.startsWith('/crafting')) {
			primaryColor = 'scredd1';
			accentColor = 'scred';
			bgColor = bgAbout;
			filter = 'filter-crafting';
			pageName = 'crafting';
		} else if ($page.route.id?.startsWith('/(cart)')) {
			primaryColor = 'scblued1';
			accentColor = 'scblue';
			bgColor = bgCart;
			filter = 'filter-cart';
			pageName = 'cart';
		} else {
			primaryColor = 'scpurpled1';
			accentColor = 'scpurplel1';
			filter = 'filter-purple';
			bgColor = bgMain;
			accentHoverColor = 'scpurpled3';
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
	//tailwind cache
	let _tw_cache = `bg-scblue text-scblue bg-scblued1 text-scblued1 bg-scbluel1 text-scbluel1
	 bg-scred text-scred bg-scredd1 text-scrredd1 bg-scredl1 text-scredl1 bg-scpurpled1
	 bg-scpurpled2 bg-scpurpled3 bg-scpurple bg-scpurplel1 bg-scoranged1 text-scoranged1
	 text-scoranged2 text-scpurpled2 text-scorangel1 text-scpurplel1 text-scorange bg-scorange
	 text-sccyand1 bg-sccyand1 text-sccyan bg-sccyan border-scpurplel1 border-scorangel1 border-scbluel1 border-sccyan border-scred text-scoranged1 text-scyand1 text-scpurpled1 text-scblued1 text-scredd1`;
</script>

<div class="relative" style="--curent-color:{primaryColor};">
	<div
		class="h-screen bg-[rgba(0,0,0,0.4)] z-20 inset-0 absolute justify-center flex flex-col items-center pb-40"
		class:hidden={!$navigating && !$load_store}>
		<Loader />
		<div class="text-white text-center text-xl mt-4 mx-auto opacity-50">Loading</div>
	</div>
	<div class="min-h-screen bg-black z-[-1] inset-0 absolute opacity-100 animate_base"></div>
	<div
		class="min-h-screen {bgCart} z-[-1] inset-0 absolute {pageName == 'cart'
			? 'opacity-100'
			: 'opacity-0'} animate_base" />
	<div
		class="min-h-screen {bgCrafting} z-[-1] inset-0 absolute {pageName == 'crafting'
			? 'opacity-100'
			: 'opacity-0'} animate_base">
	</div>
	<div
		class="min-h-screen {bgUser} z-[-1] inset-0 absolute {pageName == 'user'
			? 'opacity-100'
			: 'opacity-0'} animate_base">
	</div>
	<div
		class="min-h-screen {bgAbout} z-[-1] inset-0 absolute {pageName == 'about'
			? 'opacity-100'
			: 'opacity-0'} animate_base">
	</div>
	<div
		class="min-h-screen {bgMain} z-[-1] inset-0 absolute {pageName == 'main'
			? 'opacity-100'
			: 'opacity-0'} animate_base">
	</div>
	<div
		class="min-h-screen bg-[url('/images/noise.png')] z-20 inset-0 absolute opacity-20 animate_base pointer-events-none">
	</div>
	<div class="h-[10px] w-[25%] bg-{accentColor} mx-auto inset-0 absolute opacity-30"></div>
	<div class="app min-h-screen animate_base">
		<div
			class="menu flex flex-wrap border-b-0 justify-center items-center sticky top-0 backdrop-blur-[30px] z-10 max-sm:hidden">
			<a
				href="/"
				class="block h-3/4 border-b-0 bg-[#3f3f3f36] border-r-4 self-start transition-all ease-out duration-400 hover:border-r-8">
				<img
					class="{filter} h-full object-scale-down mt-[7%] mb-[5%] ml-3 mr-4"
					src={Logo}
					alt="Selfcrafted Logo" />
			</a>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<a
				href="/"
				class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#d8d8d8] font-figtree animate_base hover:text-[150%] rounded-lg"
				class:menu-active={$page.route.id === '/'}>
				Crafts
			</a>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<a
				href="/about"
				class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#d8d8d8] font-figtree animate_base hover:text-[150%] rounded-lg"
				class:menu-active={$page.route.id?.startsWith('/about')}>
				About
			</a>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<a
				href="/crafting"
				class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#d8d8d8] font-figtree animate_base hover:text-[150%] rounded-lg"
				class:menu-active={$page.route.id?.startsWith('/crafting')}>
				Start Crafting
			</a>

			<a href={userRoute}>
				<Icon
					icon="ph:user-focus-duotone"
					class={$page.route.id?.startsWith('/user')
						? `text-[220%] font-figtree animate_base hover:font-bold ml-8 rounded-lg bg-white text-${primaryColor}`
						: 'text-[#d8d8d8] text-[220%] font-figtree animate_base ml-8 rounded-lg'} />
			</a>

			<a href="/cart">
				<div
					class="{$page.route.id?.startsWith('/(cart)')
						? `bg-white text-${primaryColor} text-[250%] rounded-xl ml-8 p-1`
						: 'text-white text-[220%] ml-8 animate_base hover:text-[250%]'} flex justify-center items-center">
					<Icon
						icon={$cart_store.itemCount > 0
							? 'solar:cart-large-minimalistic-bold-duotone'
							: 'solar:cart-large-minimalistic-broken'} />
					<div
						class="rounded-full p-2 w-8 h-8 flex justify-center items-center !bg-white text-sm font-bold">
						<span class="text-{primaryColor}">{$cart_store.itemCount}</span>
					</div>
				</div>
			</a>
		</div>
		<div
			class="menu_mobile sm:hidden flex flex-col items-center justify-center w-full sticky top-0 backdrop-blur-[30px] z-10">
			<div class="relative flex w-full justify-center items-center h-fit">
				<a href="/" class="h-[64px] py-3 transition-all ease-out duration-400">
					<img class="{filter} h-full object-scale-down" src={Logo} alt="Selfcrafted Logo" />
				</a>

				<!-- style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;" -->
				<div class="absolute right-8 my-auto mt-3">
					<Drawer.Root shouldScaleBackground>
						<Drawer.Trigger>
							<Icon class="text-white text-3xl self-center" icon="mdi:menu" /></Drawer.Trigger>
						<Drawer.Content class="bg-{primaryColor} border-none text-white animate_base">
							<Drawer.Header>
								<Drawer.Close
									><div class="p-6 font-bold text-2xl">
										<ul class="flex flex-col justify-center items-center">
											<li
												class="mt-4 opacity-70 font-normal"
												class:menu-active-mobile={$page.route.id === '/'}>
												<a href="/">Crafts</a>
											</li>
											<li
												class="mt-4 opacity-70 font-normal"
												class:menu-active-mobile={$page.route.id?.startsWith('/about')}>
												<a href="/about">About</a>
											</li>
											<li
												class="mt-4 opacity-70 font-normal"
												class:menu-active-mobile={$page.route.id?.startsWith('/crafting')}>
												<a href="/crafting">Start Crafting</a>
											</li>
											<li
												class="mt-4 opacity-70 font-normal text-center"
												class:menu-active-mobile={$page.route.id?.startsWith('/user')}>
												<a href={userRoute}>
													<Icon
														icon="ph:user-focus-duotone"
														class={$page.route.id?.startsWith('/user')
															? `text-[150%] font-figtree animate_base hover:font-bold rounded-lg bg-white text-${primaryColor}`
															: 'text-[#d8d8d8] text-[220%] font-figtree animate_base rounded-lg'} />
												</a>
											</li>
											<li
												class="mt-4 opacity-70 font-normal text-center"
												class:menu-active-mobile={$page.route.id?.startsWith('/(cart)')}>
												<a href="/cart" class="flex justify-center items-center gap-1">
													<Icon
														icon={$cart_store.itemCount > 0
															? 'solar:cart-large-minimalistic-bold-duotone'
															: 'solar:cart-large-minimalistic-broken'}
														class={$page.route.id?.startsWith('/(cart)')
															? `text-[150%] font-figtree animate_base hover:font-bold rounded-lg bg-white text-${primaryColor}`
															: 'text-[#d8d8d8] text-[220%] font-figtree animate_base rounded-lg'} />
													<div
														class="rounded-full p-2 w-8 h-8 flex justify-center items-center !bg-white text-sm font-bold">
														<span class="text-{primaryColor}">{$cart_store.itemCount}</span>
													</div>
												</a>
											</li>
										</ul>
									</div></Drawer.Close>
							</Drawer.Header>
							<Drawer.Footer></Drawer.Footer>
						</Drawer.Content>
					</Drawer.Root>
				</div>
			</div>
		</div>
		<div class="rest">
			<slot />
		</div>
		<div
			class="footer opacity-60 text-lg text-{accentColor} flex flex-col items-center w-full justify-center text-center pb-4">
			<hr class="h-[1px] border-{accentColor} w-[60%] mt-52 mb-16" />
			<div class="flex flex-col sm:flex-row flex-wrap px-8 justify-evenly w-full gap-y-8">
				<div class="flex mx-4">
					<span>Selfcrafted © 2023&nbsp;&nbsp;&nbsp;|</span>
					<a
						target="_blank"
						href="https://discord.gg/UQ74TQfMqM"
						rel="noopener noreferrer"
						class="mr-4 ml-4">
						<Icon icon="ph:discord-logo-duotone" class="text-2xl inline-block" />
					</a>
					<a rel="noopener noreferrer" target="_blank" href="https://github.com/TheAnimatrix/SCWeb">
						<Icon icon="ph:github-logo-duotone" class="text-2xl inline-block" />
					</a>
				</div>
				<div class="flex flex-col text-start gap-y-2 mx-4">
					<a href="/policy#privacy">Privacy Policy</a>
					<a href="/policy#terms">Terms & Conditions</a>
					<a href="/policy#shipping">Shipping & Delivery</a>
				</div>
				<div class="flex flex-col text-start gap-y-2 mx-4">
					<a href="/policy#cancellation">Cancellation & Refund</a>
					<a href="/policy#contact">Contact Us</a>
				</div>
			</div>
			<span class="mt-20 mb-36">Made with ❤️ by The Animatrix</span>
		</div>
	</div>
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
	.menu-active {
		word-wrap: break-word;
		width: fit-content;
		background-color: white;
		color: black;
		font-size: 150%;
		font-weight: 700;
		font-family: figtree;
		transition: 0.2s ease-in all;
	}
	.menu-active-mobile {
		word-wrap: break-word;
		width: fit-content;
		background-color: white;
		color: black;
		font-weight: 700;
		font-family: figtree;
		transition: 0.2s ease-in all;
		@apply text-3xl p-1  opacity-100 rounded-lg;
	}

	.rest {
		margin-top: 24px;
		z-index: 1;
		height: 100%;
	}
</style>
