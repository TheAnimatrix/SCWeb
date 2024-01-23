<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as Select from '$libs/components/ui/select';

	export let productSelect = [
		{ value: 'V1', label: 'V1' },
		{ value: 'V2', label: 'V2' }
	];
	export let defaultSelected = 1;
	let productSelected = productSelect[defaultSelected];

	let isFocused = false;
	let focused = (openstate:boolean)=>{
		isFocused = openstate;
	}
</script>

<div>
	<div class="flex flex-col bg-scpurpled3 w-fit min-w-[50%] rounded-xl">
		<div class="{isFocused?"top_line":"top_line_inactive"} w-[50%] self-start ml-4 animate_base" />
		<div class="flex justify-between items-center">
			<Select.Root portal={null} bind:selected={productSelected} onOpenChange={focused}>
				<Select.Trigger class="w-[100%] border-opacity-0 m-1 ml-2">
					<Select.Value placeholder="Select a variant" data-select-value="V1" />
				</Select.Trigger>
				<Select.Content class="mt-2 border-0 bg-scpurpled3 text-white text-xl">
					<Select.Group>
						{#each productSelect as p}
							{#if p.value == 'V1'}
								<Select.Item disabled value={p.value} label={p.label}>{p.value}</Select.Item>
							{:else}
								<Select.Item value={p.value} label={p.label}>{p.value}</Select.Item>
							{/if}
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="variant"/>
			</Select.Root>
		</div>
	</div>
</div>

<style lang="postcss">
	.top_line {
		height: 1.5px;
		border-radius: 2px;
		background: linear-gradient(270deg, #9350e9 5.55%, #b378ff 91.01%, #b378ff 91.01%);
		box-shadow: 0px 9px 34px 6px rgba(224, 157, 255, 0.31);
	}
	.top_line_inactive{
		height: 1.5px;
		border-radius: 2px;
		@apply bg-scpurple
	}
</style>
