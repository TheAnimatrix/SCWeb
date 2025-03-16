<script lang="ts">
	import { getValidState, type Address, compareAddress } from '$lib/types/product';
	import Icon from '@iconify/svelte';
	function getWithoutCountryCode(phone: string) {
		if (phone?.startsWith('+91')) return phone.substring(3);
		else return phone;
	}
	
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
			address = {...address_old};
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

	const inputClasses = "w-full px-4 py-3 bg-white bg-opacity-5 rounded-lg border border-white border-opacity-10 focus:border-[#c2ff00] focus:border-opacity-50 focus:ring-1 focus:ring-[#c2ff00] focus:ring-opacity-50 outline-none text-white placeholder-gray-500 transition-all";
</script>

<div class="{className} relative">
	<div class="flex justify-between items-start mb-4">
		{#if type === 'text'}
			<div class="space-y-2">
				<div class="text-lg font-medium text-[#c2ff00]">{address.name ?? 'Name'}</div>
				<div class="text-gray-300">{address.line1 ?? 'Line 1 Address'}</div>
				<div class="text-gray-300">{address.line2 ?? 'Line 2 Address'}</div>
				<div class="text-gray-300">
					{address.city ?? 'City'}-{address.pincode ?? 'Pincode'}, {address.state ?? 'State'}
				</div>
				{#if address.phone}
					<div class="text-gray-300 flex items-center gap-2">
						<Icon icon="ph:phone-bold" />
						<span>{address.phone ?? 'Phone'}</span>
					</div>
				{/if}
			</div>
		{:else}
			<div class="w-full space-y-4">
				<div class="grid gap-4">
					<input
						type="text"
						class={inputClasses}
						placeholder="Name"
						bind:value={address.name}
					/>
					<input
						type="text"
						class={inputClasses}
						placeholder="Address Line 1"
						bind:value={address.line1}
					/>
					<input
						type="text"
						class={inputClasses}
						placeholder="Address Line 2"
						bind:value={address.line2}
					/>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<input
						type="text"
						class={inputClasses}
						placeholder="City"
						bind:value={address.city}
					/>
					<input
						type="text"
						class={inputClasses}
						placeholder="Pincode"
						bind:value={address.pincode}
					/>
					<input
						type="text"
						class={inputClasses}
						placeholder="State"
						bind:value={address.state}
					/>
				</div>
				<input
					type="tel"
					class={inputClasses}
					placeholder="Phone Number"
					bind:value={address.phone}
				/>
			</div>
		{/if}
		<div class="flex gap-2 ml-4">
			<button
				class="p-2 text-[#c2ff00] hover:bg-[#c2ff00] hover:bg-opacity-10 rounded-lg transition-all"
				on:click={toggleType}
			>
				<Icon
					icon={type == 'text' ? 'ph:pencil-bold' : 'ph:check-bold'}
					class="text-2xl"
				/>
			</button>
			<button
				class="p-2 text-red-400 hover:bg-red-400 hover:bg-opacity-10 rounded-lg transition-all"
				on:click={onDeleteLocal}
			>
				<Icon
					icon={type == 'edit' && address.id ? 'ph:x-bold' : 'ph:trash-bold'}
					class="text-2xl"
				/>
			</button>
		</div>
	</div>
</div>

<style lang="postcss">

</style>
