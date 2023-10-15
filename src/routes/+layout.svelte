<script>
	import './styles.css';
	import {goto} from "$app/navigation"
	import Logo from "$libs/svg/logo_main.svg"
	let currentMenu = 0;
</script>

<div class="app" style="height:100%;">
	<div class="menu">
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="logo"
			style="height:75%;background-color : #2c2c2c; border-bottom:0px solid #92FFFF; border-right : 6px solid #93CFC0;align-self:flex-start;transition:0.4s ease-out;"
			on:click={()=>goto("/")}
		>
			<img
				style="height:100%;object-fit : scale-down;margin-top:7%;margin-bottom:5%;margin-left:12px;margin-right:16px;"
				src="{Logo}"
				alt="Selfcrafted Logo"
			/>
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


/* The pseudo-element that will act as the bottom border */
.logo::after {
  content: "";
  height: 5px;
  background-color: red;

  /* Initially, scale down the pseudo-element to zero width */
  transform: scaleX(0);

   /* Set the transition duration and easing function */
   transition: transform .3s ease-in-out;

   /* Set the origin point of the animation to right */
   transform-origin: right;
}

/* On hover, scale up the pseudo-element to full width */
.logo:hover::after {
   transform: scaleX(1);

   /* Optionally, change the origin point of the animation to left */
   transform-origin: left;
}

	p {
		word-wrap: break-word;
		width: fit-content;
		padding: 0.3%;
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
		flex-wrap: wrap;
		border: 0px;
		justify-content: center;
		align-items: center;
		position: sticky;
		top: 0;
		backdrop-filter: blur(30px);
	}

	.menu > * {
		margin-right: 30px;
	}

	.rest {
		margin-top: 24px;
	}
</style>
