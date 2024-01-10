<script>
	import { each } from 'svelte/internal';
	import arrowLeft from '$libs/svg/arrow_left.svg';
	export let curActive;
	export let max;
	let boilerPlate = ' transition-all duration-200 linear ';
	export let colorPrimary = 'bg-white';
	export let colorSecondary = 'bg-scpurple';
	export let colorAccent = 'hover:bg-scpurplel1';
	export let styleActive;
	export let styleNormal;
	let i = 0;

	styleActive = `rounded-lg box-border w-[24%] h-[12px] mr-[8px] ${colorPrimary}` + boilerPlate;
	styleNormal =`rounded-lg box-border w-[6%] h-[12px] mr-[8px] ${colorSecondary} ${colorAccent} hover:w-[12%] ${boilerPlate}`;

	const prevIndicator = function () {
		console.log('clicked prev ' + i++);
		curActive = curActive > 0 ? curActive - 1 : curActive;
	};

	const nextIndicator = function () {
		curActive = curActive < max - 1 ? curActive + 1 : curActive;
	};
</script>

<div id="feat-mb-indicator">
	<button on:click={prevIndicator} class="btn-clear">
		<img src={arrowLeft} alt="<" style="margin-right: 8px;" />
	</button>
	{#each Array(max) as _, i (i)}
		<button
            class={i === curActive ? styleActive : styleNormal}
			on:click={() => {
				curActive = i;
			}}
		/>
	{/each}
	<button on:click={nextIndicator} class="btn-clear">
		<img src={arrowLeft} style="transform: rotate(180deg);" alt=">" />
	</button>
</div>

<style lang="postcss">
	.btn-clear {
		background: none;
		color: inherit;
		border: none;
		padding: 0;
		font: inherit;
		cursor: pointer;
		outline: inherit;
	}

	#feat-mb-indicator {
		width: 100%;
		color: white;
		margin-top: 16px;
		display: flex;
		align-items: center;
	}
</style>
