<script lang="ts">
	import { getValidState, type Address, compareAddress } from '$lib/stores/types/product';
	import Icon from '@iconify/svelte';
	import GlowleftInput from './glowleft_input.svelte';
	export let type = 'text';
	export let address: Address,
		address_old: Address = {};
	let name;
	export let onDelete = (isCloseOnly: boolean) => {
		alert('delete clicked');
		address = {};
	};

	let onDeleteLocal = () => {
		if (type == 'text' || !address.id) onDelete(false);
		else {
			type = 'text';
			onDelete(true);
		}
	};

	export let onSave = (isChanged:boolean, addr: Address): boolean => {
		return false;
	};

	export let onEditStart = (): boolean => {
		return false;
	};

	let className = '';
	export { className as class };

	function toggleType() {
		let k = true;
		if (type == 'edit') k = onSave(!compareAddress(address_old,address),address);
		if (type == 'text') {
			address_old = {...address};
			k = onEditStart();
		}
		if (k) type = type == 'text' ? 'edit' : 'text';
	}
</script>

<div
	class="flex flex-row max-sm:flex-col border-[1px] border-orange-300 rounded-xl p-4 bg-scoranged2 {className}"
>
	<div
		class="flex flex-col flex-1 self-start text-orange-200 opacity-80 font-medium text-lg animate_base"
	>
		{#if type == 'text'}
			<div>
				<div>{address.name ?? 'Name'}</div>
				<div>{address.line1 ?? 'Line 1 Address'}</div>
				<div>{address.line2 ?? 'Line 2 Address'}</div>
				<div>
					{address.city ?? 'City'}-{address.pincode ?? 'Pincode'}, {address.state ?? 'State'}
				</div>
				{#if address.phone}
					<div>Phone: {address.phone ?? 'Phone'}</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-wrap flex-col space-y-2">
				<GlowleftInput
					f22="bg-scoranged1"
					gradient="bg-orange-300 bg-opacity-80"
					inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
					bind:value={address.name}
					placeholder={address.name ?? 'Name'}
				/>
				<GlowleftInput
					f22="bg-scoranged1"
					gradient="bg-orange-300 bg-opacity-80"
					inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
					bind:value={address.line1}
					placeholder={address.line1 ?? 'Line 1 Address'}
				/>
				<GlowleftInput
					f22="bg-scoranged1"
					gradient="bg-orange-300 bg-opacity-80"
					inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
					bind:value={address.line2}
					placeholder={address.line2 ?? 'Line 2 Address'}
				/>
				<div class="flex flex-wrap w-full gap-x-2 gap-y-2">
					<GlowleftInput
						f22="bg-scoranged1"
						class="flex-1 min-w-32"
						gradient="bg-orange-300 bg-opacity-80"
						inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
						bind:value={address.city}
						placeholder={address.city ?? 'City'}
					/>
					<GlowleftInput
						f22="bg-scoranged1"
						class="flex-1 min-w-32"
						gradient="bg-orange-300 bg-opacity-80"
						inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
						bind:value={address.pincode}
						placeholder={address.pincode ?? 'Pincode'}
					/>
					<GlowleftInput
						f22="bg-scoranged1"
						class="flex-1 min-w-32"
						gradient="bg-orange-300 bg-opacity-80"
						inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
						bind:value={address.state}
						placeholder={address.state ?? 'State'}
					/>
				</div>
				<GlowleftInput
					f22="bg-scoranged1"
					class="w-fit"
					gradient="bg-orange-300 bg-opacity-80"
					inputClass="text-start !text-orange-200 !text-lg !px-2 !placeholder-orange-200 !placeholder-opacity-30"
					bind:value={address.phone}
					placeholder={address.phone ?? 'Phone'}
				/>
			</div>
		{/if}
	</div>
	<div class="flex self-start flex-[0_1_0%] ml-2">
		<button on:click={toggleType}>
			<Icon
				icon={type == 'text' ? 'iconamoon:edit-duotone' : 'iconamoon:check-square-duotone'}
				class="text-orange-300 text-3xl m-2"
			/>
		</button>
		<button on:click={onDeleteLocal}>
			<Icon
				icon="iconamoon:trash-simple-duotone"
				class="text-orange-300 text-3xl m-2 {type == 'edit' && address.id ? 'hidden' : 'visible'}"
			/>
			<Icon
				icon="iconamoon:close-circle-1-duotone"
				class="text-orange-300 text-3xl m-2 {type == 'text' || !address.id ? 'hidden' : 'visible'}"
			/>
		</button>
	</div>
</div>

<style lang="postcss">
	input {
		@apply bg-scoranged1 rounded-lg p-2 placeholder-orange-200 placeholder-opacity-30  focus:outline-none focus:outline focus:outline-2 flex-1 border-l-2 border-spacing-2;
	}
</style>
