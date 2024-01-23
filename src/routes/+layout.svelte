<script lang="ts">
	import './styles.css';
	export let data;
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Logo from '$libs/svg/logo_main.svg';
	import Icon from '@iconify/svelte';
	import * as Drawer from '$libs/components/ui/drawer';
	import { Button } from '$libs/components/ui/button';
	import '../app.pcss';

	let bgColor: string,
		accentColor: string,
		accentHoverColor: string,
		filter: string,
		primaryColor: string;
	$: {
		if ($page.route.id?.startsWith('/user')) {
			console.log('hello');
			primaryColor = 'scoranged1';
			accentColor = 'scorange';
			bgColor = 'bg-gradient-to-tr from-[#040201] to-[#1d140b]';
			filter = 'filter-orange';
		} else {
			primaryColor = 'scpurpled1';
			accentColor = 'scpurplel1';
			filter = 'filter-purple';
			bgColor = 'bg-gradient-to-tr from-[#0d0815] to-[#180c2c]';
			accentHoverColor = 'scpurpled3';
		}
	}
	//tailwind cache
	let _tw_cache =
		'bg-scpurpled1 bg-scpurpled2 bg-scpurpled3 bg-scpurple bg-scoranged1 text-scoranged1 text-scoranged2 text-scpurpled2 text-scorangel1 text-scpurplel1 text-scorange bg-scorange';
</script>

<div class="app min-h-screen {bgColor}">
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
			class:menu-active={data.id === '/'}
		>
			Crafts
		</a>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			href="/about"
			class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree animate_base hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
			class:menu-active={data.id?.startsWith('/about')}
		>
			About
		</a>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			href="/crafting"
			class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree animate_base hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
			class:menu-active={data.id?.startsWith('/crafting')}
		>
			Start Crafting
		</a>

		<a href="/user">
			<Icon
				icon="ph:user-focus-duotone"
				class={data.id?.startsWith('/user')
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
						<Drawer.Title>Menu options</Drawer.Title>
						<Drawer.Close
							><div class="p-6 font-bold text-2xl">
								<ul class="flex flex-col justify-center items-center">
									<li
										class="mt-4 opacity-70 font-normal"
										class:menu-active-mobile={data.id === '/'}
									>
										<a href="/">Crafts</a>
									</li>
									<li
										class="mt-4 opacity-70 font-normal"
										class:menu-active-mobile={data.id?.startsWith('/about')}
									>
										<a href="/about">About</a>
									</li>
									<li
										class="mt-4 opacity-70 font-normal"
										class:menu-active-mobile={data.id?.startsWith('/crafting')}
									>
										<a href="/crafting">Start Crafting</a>
									</li>
									<li
										class="mt-4 opacity-70 font-normal text-center"
										class:menu-active-mobile={data.id?.startsWith('/user')}
									>
										<a href="/user">
											<Icon
												icon="ph:user-focus-duotone"
												class={data.id?.startsWith('/user')
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
</div>

<style lang="postcss">
	.filter-purple {
		filter: hue-rotate(87deg);
	}

	.filter-orange {
		filter: hue-rotate(225deg);
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
