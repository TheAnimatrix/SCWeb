<script lang="ts">
	import { onMount } from 'svelte';
	// import { each } from 'svelte/internal';
	import arrowLeft from '$lib/svg/arrow_left.svg';
	let boilerPlate = ' transition-all duration-200 linear ';
	interface Props {
		curActive: number;
		max: number;
		colorPrimary?: string;
		colorSecondary?: string;
		hoverAccent?: string;
		styleActive?: string;
		styleNormal?: string;
		wActive?: string;
		wNormal?: string;
		hoverNormal?: string;
		interval?: number | undefined;
	}

	let {
		curActive = $bindable(),
		max,
		colorPrimary = 'bg-white',
		colorSecondary = 'bg-scpurple',
		hoverAccent = 'hover:bg-scpurplel1',
		styleActive = $bindable(''),
		styleNormal = $bindable(''),
		wActive = 'w-[24%]',
		wNormal = 'w-[6%]',
		hoverNormal = 'w-[8%]',
		interval = 0
	}: Props = $props();
	let i = 0;

	styleActive = `rounded-lg box-border ${wActive} h-[12px] mr-[8px] ${colorPrimary} ` + boilerPlate;
	styleNormal = `rounded-lg box-border ${wNormal} h-[12px] mr-[8px] ${colorSecondary} ${hoverAccent} ${hoverNormal} ${boilerPlate}`;

	const prevIndicator = function () {
		curActive = curActive > 0 ? curActive - 1 : curActive;
	};

	const nextIndicator = function () {
		curActive = curActive < max - 1 ? curActive + 1 : 0;
	};

	onMount(() => {
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
			onclick={() => {
				curActive = i;
			}}
		></button>
	{/each}
</div>

<style>
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
