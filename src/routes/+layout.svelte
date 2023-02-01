<script>
	import './styles.css';

	let currentMenu = 0;
</script>

<div class="app" style="height:100%;">
	<div class="menu">
			<div style="height:75%;background-color : #2c2c2c; border-right : 6px solid #93CFC0;align-self:flex-start;">
				<img style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;" src="src/libs/svg/logo_main.svg" alt="Selfcrafted Logo" />
			</div>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<p
					class:menu-active={currentMenu === 0}
					on:click={() => {
						currentMenu = 0;
					}}
				>
					Crafts
				</p>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<p
					class:menu-active={currentMenu === 1}
					on:click={() => {
						currentMenu = 1;
					}}
				>
					About
				</p>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<p
					class:menu-active={currentMenu === 2}
					on:click={() => {
						currentMenu = 2;
					}}
				>
					Sell your craft
				</p>
	</div>
	<div class="rest">
		<slot />
	</div>
</div>

<style>
	p {
		word-wrap: break-word;
		width: fit-content;
		padding : 0.3%;
		color: #b4b4b4;
		font-size: 140%;
		font-family: figtree;
		font-weight: 520;
		justify-content: center;
		transition: 0.2s ease-in all;
	}

	p:hover,
	p:active,
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

	p:hover {
		transition: 0.2s ease-in all;
		background-color: #c6fff1;
	}

	.menu {
		display: flex;
		border: 0px;
		justify-content: center;
		align-items: center;
		position: sticky;
		top : 0;
		backdrop-filter: blur(90px);
	}

	.menu > * {
		margin-right: 30px;
	}

	.rest {
		margin-top : 24px;
	}
	
</style>
