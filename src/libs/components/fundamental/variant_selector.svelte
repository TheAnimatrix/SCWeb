<script lang="ts">
	export let values = ['V1', 'V2'];
	import Icon from '@iconify/svelte';
	import * as Select from '$libs/components/ui/select';

  let productSelect = [{value:"V1",label:"V1"},{value:"V2", label:"V2"}];
  let productSelected = productSelect[1];
</script>

<div>
	<div class="flex flex-col bg-scpurpled3 w-fit min-w-[50%] rounded-xl">
		<div class="top_line w-[50%] self-start ml-4" />
		<div class="flex justify-between items-center">
			<Select.Root portal={null} bind:selected={productSelected}>
				<Select.Trigger class="w-[100%] border-opacity-0 m-1 ml-2">
					<Select.Value placeholder="Select a variant" data-select-value="V1" />
				</Select.Trigger>
				<Select.Content class="mt-2 border-0 bg-scpurpled3 text-white text-xl">
					<Select.Group>
						{#each productSelect as p}
              {#if p.value=="V1"}
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
</style>
