<script lang="ts">
	import { onMount } from 'svelte';
	// import { each } from 'svelte/internal';
	import arrowLeft from '$libs/svg/arrow_left.svg';
	export let curActive : number;
	export let max : number;
	let boilerPlate = ' transition-all duration-200 linear ';
	export let colorPrimary = 'bg-white';
	export let colorSecondary = 'bg-scpurple';
	export let hoverAccent = 'hover:bg-scpurplel1';
	export let styleActive : string;
	export let styleNormal : string;
	export let wActive = 'w-[24%]';
	export let wNormal = 'w-[6%]';
	export let hoverNormal = 'w-[8%]';
	export let interval : number | undefined = 0;
	let i = 0;

	styleActive = `rounded-lg box-border ${wActive} h-[12px] mr-[8px] ${colorPrimary} ` + boilerPlate;
	styleNormal = `rounded-lg box-border ${wNormal} h-[12px] mr-[8px] ${colorSecondary} ${hoverAccent} ${hoverNormal} ${boilerPlate}`;

	const prevIndicator = function () {
		console.log('clicked prev ' + i++);
		curActive = curActive > 0 ? curActive - 1 : curActive;
	};

	const nextIndicator = function () {
		curActive = curActive < max - 1 ? curActive + 1 : 0;
	};

	onMount(async () => {
		if (interval) {
			setInterval(nextIndicator, interval);
			return () => clearInterval(interval);
		}
	});
</script>

<div id="feat-mb-indicator">
	{#each Array(max) as _, i (i)}
		<button
			class={i === curActive ? styleActive : styleNormal}
			on:click={() => {
				curActive = i;
			}}
		/>
	{/each}
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
