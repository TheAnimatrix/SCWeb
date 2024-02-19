<script lang="ts">
	import './styles.css';
	import { loading } from '$lib/stores/loading';
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import Logo from '$lib/svg/logo_main.svg';
	import Icon from '@iconify/svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Button } from '$lib/components/ui/button';
	import '../app.pcss';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import Loader from '$lib/components/fundamental/Loader.svelte';

	let bgColor: string,
		accentColor: string,
		accentHoverColor: string,
		filter: string,
		primaryColor: string;

	let bgUser: string, bgAbout: string, bgMain: string, bgCrafting: string;
	bgUser = 'bg-gradient-to-tr from-[#040201] to-[#1d140b]';
	bgAbout = 'bg-gradient-to-tr from-[#030606] to-[#0c1213]';
	bgMain = 'bg-gradient-to-tr from-[#0d0815] to-[#180c2c]';
	bgCrafting = 'bg-gradient-to-tr from-[#050000] to-[#1c0808]';
	let pageName: string;
	$: {
		if ($page.route.id?.startsWith('/user')) {
			primaryColor = 'scoranged1';
			accentColor = 'scorange';
			bgColor = bgUser;
			filter = 'filter-orange';
			pageName = 'user';
		} else if ($page.route.id?.startsWith('/about')) {
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
	data.supabase_lt.auth.onAuthStateChange((event, session) => {
		if (event === 'SIGNED_OUT') {
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
	
	//tailwind cache
	let _tw_cache =
		'bg-scred text-scred bg-scredd1 text-scrredd1 bg-scredl1 text-scredl1 bg-scpurpled1 bg-scpurpled2 bg-scpurpled3 bg-scpurple bg-scpurplel1 bg-scoranged1 text-scoranged1 text-scoranged2 text-scpurpled2 text-scorangel1 text-scpurplel1 text-scorange bg-scorange text-sccyand1 bg-sccyand1 text-sccyan bg-sccyan';
</script>

<div class="relative">
	<div
		class="h-screen bg-[rgba(0,0,0,0.4)] z-20 inset-0 absolute justify-center flex flex-col items-center pb-40"
		class:hidden={!$loading}
	>
		<Loader />
		<div class="text-white text-center text-xl mt-4 mx-auto opacity-50">Loading</div>
	</div>
	<div class="min-h-screen bg-black z-[-1] inset-0 absolute opacity-100 animate_base"></div>
	<div
		class="min-h-screen {bgCrafting} z-[-1] inset-0 absolute {pageName == 'crafting'
			? 'opacity-100'
			: 'opacity-0'} animate_base"
	></div>
	<div
		class="min-h-screen {bgUser} z-[-1] inset-0 absolute {pageName == 'user'
			? 'opacity-100'
			: 'opacity-0'} animate_base"
	></div>
	<div
		class="min-h-screen {bgAbout} z-[-1] inset-0 absolute {pageName == 'about'
			? 'opacity-100'
			: 'opacity-0'} animate_base"
	></div>
	<div
		class="min-h-screen {bgMain} z-[-1] inset-0 absolute {pageName == 'main'
			? 'opacity-100'
			: 'opacity-0'} animate_base"
	></div>
	<div
		class="min-h-screen bg-[url('/images/noise.png')] z-20 inset-0 absolute opacity-20 animate_base pointer-events-none"
	></div>
	<div class="h-[10px] w-[25%] bg-{accentColor} mx-auto inset-0 absolute opacity-30"></div>
	<div class="app min-h-screen animate_base">
		<div
			class="menu flex flex-wrap border-b-0 justify-center items-center sticky top-0 backdrop-blur-[30px] z-10 max-sm:hidden"
		>
			<a
				href="/"
				class="block logo h-3/4 border-b-0 bg-[#3f3f3f36] border-r-4 self-start transition-all ease-out duration-400 hover:border-r-8"
			>
				<img
					class={filter}
					style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;"
					src={Logo}
					alt="Selfcrafted Logo"
				/>
			</a>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<a
				href="/"
				class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree animate_base hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
				class:menu-active={$page.route.id === '/'}
			>
				Crafts
			</a>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<a
				href="/about"
				class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree animate_base hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
				class:menu-active={$page.route.id?.startsWith('/about')}
			>
				About
			</a>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<a
				href="/crafting"
				class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree animate_base hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
				class:menu-active={$page.route.id?.startsWith('/crafting')}
			>
				Start Crafting
			</a>

			<a href={userRoute}>
				<Icon
					icon="ph:user-focus-duotone"
					class={$page.route.id?.startsWith('/user')
						? `text-[220%] font-figtree animate_base hover:font-bold ml-8 rounded-lg bg-white text-${primaryColor}`
						: 'text-[#b4b4b4] text-[220%] font-figtree animate_base hover:text-[250%] hover:text-scpurplel2 hover:font-bold ml-8 rounded-lg'}
				/>
			</a>
		</div>
		<div
			class="menu_mobile sm:hidden flex flex-col items-center justify-center w-full sticky top-0 backdrop-blur-[30px] z-10"
		>
			<div class="flex space-x-12">
				<a
					href="/"
					class="flex-1 block logo h-3/4 border-b-0 bg-[#3f3f3f36] border-r-4 transition-all ease-out duration-400 hover:border-r-8"
				>
					<img
						class={filter}
						style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;"
						src={Logo}
						alt="Selfcrafted Logo"
					/>
				</a>
				<Drawer.Root shouldScaleBackground>
					<Drawer.Trigger>
						<Icon class="text-{accentColor} text-4xl self-center" icon="mdi:menu" /></Drawer.Trigger
					>
					<Drawer.Content class="bg-{primaryColor} border-none text-white animate_base">
						<Drawer.Header>
							<Drawer.Close
								><div class="p-6 font-bold text-2xl">
									<ul class="flex flex-col justify-center items-center">
										<li
											class="mt-4 opacity-70 font-normal"
											class:menu-active-mobile={$page.route.id === '/'}
										>
											<a href="/">Crafts</a>
										</li>
										<li
											class="mt-4 opacity-70 font-normal"
											class:menu-active-mobile={$page.route.id?.startsWith('/about')}
										>
											<a href="/about">About</a>
										</li>
										<li
											class="mt-4 opacity-70 font-normal"
											class:menu-active-mobile={$page.route.id?.startsWith('/crafting')}
										>
											<a href="/crafting">Start Crafting</a>
										</li>
										<li
											class="mt-4 opacity-70 font-normal text-center"
											class:menu-active-mobile={$page.route.id?.startsWith('/user')}
										>
											<a href="{userRoute}">
												<Icon
													icon="ph:user-focus-duotone"
													class={$page.route.id?.startsWith('/user')
														? `text-[150%] font-figtree animate_base hover:font-bold rounded-lg bg-white text-${primaryColor}`
														: 'text-[#b4b4b4] text-[220%] font-figtree animate_base hover:text-[250%] hover:text-scpurplel2 hover:font-bold rounded-lg'}
												/>
											</a>
										</li>
									</ul>
								</div></Drawer.Close
							>
						</Drawer.Header>
						<Drawer.Footer></Drawer.Footer>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</div>
		<div class="rest">
			<slot />
		</div>
		<div
			class="footer opacity-60 text-lg text-{accentColor} flex items-center w-full justify-center text-center pb-4"
		>
			Selfcrafted © 2023&nbsp;&nbsp;&nbsp;|
			<a
				target="_blank"
				href="https://discord.gg/UQ74TQfMqM"
				rel="noopener noreferrer"
				class="mr-4 ml-4"><Icon icon="ph:discord-logo-duotone" class="text-2xl inline-block" /></a
			><a rel="noopener noreferrer" target="_blank" href="https://github.com/TheAnimatrix/SCWeb"
				><Icon icon="ph:github-logo-duotone" class="text-2xl inline-block" /></a
			>
		</div>
	</div>
</div>

<style lang="postcss">
	.filter-purple {
		filter: hue-rotate(98deg);
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

	:global(body)::-webkit-scrollbar {
		width: 6px;
	}

	/* Track */
	:global(body)::-webkit-scrollbar-track {
		background: #333333;
		border-radius: 12px;
	}

	/* Handle */
	:global(body)::-webkit-scrollbar-thumb {
		background-color: rgb(94, 94, 94);
		border-radius: 12px;
		transition: 0.4s linear ease-in;
	}

	/* Handle on hover */
	:global(body)::-webkit-scrollbar-thumb:hover {
		background-color: #9fcdc0;
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
		@apply text-3xl p-1  opacity-100;
	}

	.rest {
		margin-top: 24px;
		z-index: 1;
		height: 100%;
	}
</style>
