<script lang="ts">
	import { getValidState, type Address, compareAddress } from '$lib/types/product';
	import Icon from '@iconify/svelte';
	
	function getWithoutCountryCode(phone: string | undefined) {
		if (!phone) return '';
		if (phone.startsWith('+91')) return phone.substring(3);
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

	const inputClasses = "w-full px-4 py-3 bg-[#252525]/80 rounded-lg border border-[#353535] focus:border-accent/50 focus:ring-1 focus:ring-accent/30 outline-none text-white placeholder-gray-500 transition-all";
</script>

<div class="{className} bg-[#151515]/30 rounded-xl border border-[#252525] overflow-hidden transition-all duration-300">
	<div class="flex justify-between items-start p-4">
		{#if type === 'text'}
			<!-- Read-only address display -->
			<div class="space-y-2 text-gray-300">
				<div class="text-lg font-medium text-accent">{address.name || 'Name'}</div>
				
				<div class="flex items-start">
					<Icon icon="ph:map-pin-bold" class="mt-1 mr-2 text-accent/50" />
					<div class="space-y-1">
						<div>{address.line1 || 'Address Line 1'}</div>
						<div>{address.line2 || 'Address Line 2'}</div>
						<div>{address.city || 'City'} - {address.pincode || 'Pincode'}, {address.state || 'State'}</div>
					</div>
				</div>
				
				{#if address.phone}
					<div class="flex items-center mt-2">
						<Icon icon="ph:phone-bold" class="mr-2 text-accent/50" />
						<span>+91 {getWithoutCountryCode(address.phone)}</span>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Edit mode with form fields -->
			<div class="w-full space-y-4">
				<!-- Name field -->
				<div>
					<label for="name" class="text-sm font-medium text-gray-400 mb-1 block">Full Name</label>
					<div class="relative">
						<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent/70">
							<Icon icon="ph:user-bold" />
						</div>
						<input
							id="name"
							type="text"
							class="{inputClasses} pl-10"
							placeholder="Enter your full name"
							bind:value={address.name}
						/>
					</div>
				</div>
				
				<!-- Address fields -->
				<div>
					<label for="line1" class="text-sm font-medium text-gray-400 mb-1 block">Address Line 1</label>
					<div class="relative">
						<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent/70">
							<Icon icon="ph:map-pin-bold" />
						</div>
						<input
							id="line1"
							type="text"
							class="{inputClasses} pl-10"
							placeholder="Street address"
							bind:value={address.line1}
						/>
					</div>
				</div>
				
				<div>
					<label for="line2" class="text-sm font-medium text-gray-400 mb-1 block">Address Line 2</label>
					<input
						id="line2"
						type="text"
						class="{inputClasses}"
						placeholder="Apartment, suite, unit, building, floor, etc."
						bind:value={address.line2}
					/>
				</div>
				
				<!-- City, Pincode, State in a row for larger screens -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label for="city" class="text-sm font-medium text-gray-400 mb-1 block">City</label>
						<input
							id="city"
							type="text"
							class="{inputClasses}"
							placeholder="City"
							bind:value={address.city}
						/>
					</div>
					
					<div>
						<label for="pincode" class="text-sm font-medium text-gray-400 mb-1 block">Pincode</label>
						<input
							id="pincode"
							type="text"
							class="{inputClasses}"
							placeholder="Pincode / ZIP"
							bind:value={address.pincode}
						/>
					</div>
					
					<div>
						<label for="state" class="text-sm font-medium text-gray-400 mb-1 block">State</label>
						<input
							id="state"
							type="text"
							class="{inputClasses}"
							placeholder="State"
							bind:value={address.state}
						/>
					</div>
				</div>
				
				<!-- Phone field -->
				<div>
					<label for="phone" class="text-sm font-medium text-gray-400 mb-1 block">Phone Number</label>
					<div class="relative">
						<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent/70">
							<Icon icon="ph:phone-bold" />
						</div>
						<div class="absolute left-10 top-1/2 transform -translate-y-1/2 text-gray-500">
							+91
						</div>
						<input
							id="phone"
							type="tel"
							class="{inputClasses} pl-16"
							placeholder="Phone number"
							bind:value={address.phone}
						/>
					</div>
				</div>
			</div>
		{/if}
		
		<div class="flex gap-2 ml-4">
			<button
				class="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
				on:click={toggleType}
				aria-label={type === 'text' ? 'Edit address' : 'Save address'}
			>
				<Icon
					icon={type === 'text' ? 'ph:pencil-bold' : 'ph:check-bold'}
					class="text-xl"
				/>
			</button>
			
			<button
				class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
				on:click={onDeleteLocal}
				aria-label={type === 'edit' && address.id ? 'Cancel edit' : 'Delete address'}
			>
				<Icon
					icon={type === 'edit' && address.id ? 'ph:x-bold' : 'ph:trash-bold'}
					class="text-xl"
				/>
			</button>
		</div>
	</div>
</div>

<style lang="postcss">
  /* Add smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }
</style>
