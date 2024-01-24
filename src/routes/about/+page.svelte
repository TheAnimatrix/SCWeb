<script lang="ts">
	import snarkdown from 'snarkdown';
	import { ABOUT_STRINGS } from '$libs/stores/strings';
	let origin = ABOUT_STRINGS.origin;
    let vision = ABOUT_STRINGS.vision;
    let risks = ABOUT_STRINGS.risks;
	let currentSelection: number = 0;
	import * as Card from '$libs/components/ui/card';
</script>

<div class="text-white flex flex-col text-center mt-8 ">
	<span class="font-bold text-2xl mx-4">Alright, We need to talk.</span>
	<span class="text-xl mx-4"
		>We know you have a lot of questions on how this works.<br />
		So we curated some of them below.</span
	>
	<div class="mt-8 w-full flex justify-center">
		<div class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3">
				<Card.Header>
					<Card.Title class="text-2xl">Origin</Card.Title>
					<!-- <Card.Description>Card Description</Card.Description> -->
				</Card.Header>
				<Card.Content>
					{@html snarkdown(origin)}
					<!-- <p class="text-lg">{ABOUT_STRINGS.vision}</p> -->
				</Card.Content>
				<!-- <Card.Footer>
					<p>Card Footer</p>
				</Card.Footer> -->
			</Card.Root>
			<div class="flex w-full max-lg:flex-col">
				<Card.Root class="bg-[#131819] border-none flex-[4] text-white text-left mb-48 max-lg:mb-3">
					<Card.Header>
						<Card.Title class="text-2xl">Vision & Roadmap</Card.Title>
						<!-- <Card.Description>Card Description</Card.Description> -->
					</Card.Header>
					<Card.Content>
						{@html snarkdown(vision)}
						<!-- <p class="text-lg">{ABOUT_STRINGS.vision}</p> -->
					</Card.Content></Card.Root
				>
				<Card.Root class="bg-[#131819] border-none flex-[2] text-white text-left mb-48 ml-4 max-lg:ml-0">
					<Card.Header>
						<Card.Title class="text-2xl">Risk of purchase</Card.Title>
						<!-- <Card.Description>Card Description</Card.Description> -->
					</Card.Header>
					<Card.Content>
						{@html snarkdown(risks)}
						<!-- <p class="text-lg">{ABOUT_STRINGS.vision}</p> -->
					</Card.Content>
					<!-- <Card.Footer>
					<p>Card Footer</p>
				</Card.Footer> -->
				</Card.Root>
			</div>
			<!-- <div class="flex flex-col mb-4 mt-2">
				<button
					on:click={() => {
						currentSelection = 0;
					}}
					class="category"
					class:selected-category={currentSelection == 0}>Vision</button
				>
				<button
					on:click={() => {
						currentSelection = 1;
					}}
					class="category"
					class:selected-category={currentSelection == 1}>The Present</button
				>
				<button
					on:click={() => {
						currentSelection = 2;
					}}
					class="category"
					class:selected-category={currentSelection == 2}>The Next</button
				>
				<button
					on:click={() => {
						currentSelection = 3;
					}}
					class="category"
					class:selected-category={currentSelection == 3}>Origin</button
				>
				<button
					on:click={() => {
						currentSelection = 4;
					}}
					class="category"
					class:selected-category={currentSelection == 4}>Questioning Practicality</button
				>
				<button
					on:click={() => {
						currentSelection = 5;
					}}
					class="category"
					class:selected-category={currentSelection == 5}>Unveiling the Why</button
				>
				<button
					on:click={() => {
						currentSelection = 6;
					}}
					class="category"
					class:selected-category={currentSelection == 6}>Risk of Purchase</button
				>
				<button
					on:click={() => {
						currentSelection = 7;
					}}
					class="category"
					class:selected-category={currentSelection == 7}>Operational costs</button
				>
			</div>
			<div class="flex flex-[4] flex-col">content of tabs</div> -->
		</div>
	</div>
</div>

<style lang="postcss">
	.category {
		@apply mt-6 text-xl text-[#9D9D9D] font-semibold ease-linear transition-all duration-200;
	}

	.selected-category {
		@apply font-bold text-2xl bg-opacity-20 rounded-[38px] bg-black p-4 text-white;
	}
</style>
