<script lang="ts">
	import './styles.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Logo from '$libs/svg/logo_main.svg';
    import Icon from '@iconify/svelte';
	import '../app.pcss';
	let currentMenu = 0;

	let isHomePage = false;
	//TODO - only for /crafts/item
	//TODO - intellisense not working
	$: $page.url.pathname === '/' ? (isHomePage = true) : (isHomePage = false);
</script>

<div class="app h-screen bg-sc">
	<div
		class="menu flex flex-wrap border-b-0 justify-center items-center sticky top-0 backdrop-blur-[30px] z-10 max-sm:hidden"
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- {#if !isHomePage}
			<button
				on:click={() => {
					goto('/');
					currentMenu = 0;
				}}><Icon class="text-2xl text-scpurplel1 mr-3" icon="iconamoon:home-duotone"/></button
			>
		{/if} -->
		<a
			href="/"
			on:click={() => {
				currentMenu = 0;
			}}
			class="block logo h-3/4 border-b-0 bg-[#3f3f3f36] border-r-4 self-start transition-all ease-out duration-400 hover:border-r-8"
		>
			<img
				class="filter-purple"
				style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;"
				src={Logo}
				alt="Selfcrafted Logo"
			/>
		</a>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			href="/"
			class="menu_button ml-8  p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree transition-all ease-in duration-200 hover:bg-scpurpled3 hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
			class:menu-active={currentMenu === 0}
			on:click={() => {
				currentMenu = 0;
			}}
		>
			Crafts
		</a>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			href="/about"
			class="menu_button ml-8  p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree transition-all ease-in duration-200 hover:bg-scpurpled3 hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
			class:menu-active={currentMenu === 1}
			on:click={() => {
				currentMenu = 1;
			}}
		>
			About
		</a>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			href="/crafting"
			class="menu_button ml-8 p-1 first-letter:break-words w-auto text-[140%] text-[#b4b4b4] font-figtree transition-all ease-in duration-200 hover:bg-scpurpled3 hover:text-[150%] hover:text-scpurplel2 hover:font-bold rounded-lg"
			class:menu-active={currentMenu === 2}
			on:click={() => {
				currentMenu = 2;
			}}
		>
			Start Crafting
		</a>

		<a
			href="/user"
			on:click={() => {
				currentMenu = 3;
			}}
		>
			<Icon icon="ph:user-focus-duotone" class={currentMenu == 3 ? "text-[220%] font-figtree transition-all ease-in duration-200 bg-white text-black hover:font-bold ml-8 rounded-lg" : "text-[#b4b4b4] text-[220%] font-figtree transition-all ease-in duration-200 hover:bg-scpurpled3 hover:text-[250%] hover:text-scpurplel2 hover:font-bold ml-8 rounded-lg"}/>
		</a>
	</div>
	<div
		class="menu_mobile sm:hidden flex flex-col items-center justify-center w-full sticky top-0 backdrop-blur-[30px] z-10 "
	>
		<div class="flex space-x-12">
			<a
				href="/"
				class="flex-1 block logo h-3/4 border-b-0 bg-[#3f3f3f36]  border-r-4 transition-all ease-out duration-400 hover:border-r-8"
			>
				<img
					class="filter-purple"
					style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;"
					src={Logo}
					alt="Selfcrafted Logo"
				/>
			</a>
			<Icon class="text-scpurplel1 text-4xl self-center" icon="mdi:menu"/>
		</div>
	</div>
	<div class="rest">
		<slot />
	</div>
</div>

<style lang="postcss">
	
	.filter-purple{
    filter: hue-rotate(87deg);
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

	.rest {
		margin-top: 24px;
		z-index: 1;
		height: 100%;
	}
</style>
