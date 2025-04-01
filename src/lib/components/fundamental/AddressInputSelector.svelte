<script lang="ts">
	import Icon from '@iconify/svelte';
	import {
		getValidState,
		type Address,
		compareAddress,
		validateAddress,
		newAddress
	} from '$lib/types/product';

	function getWithoutCountryCode(phone: string | undefined) {
		if (!phone) return '';
		if (phone.startsWith('+91')) return phone.substring(3);
		else return phone;
	}


	let addressError: string | undefined = $state();


	let onDeleteLocal = () => {
		if (type == 'text' || !address.id) onDelete(false);
		else {
			type = 'text';
			onDelete(true);
		}
	};



	interface Props {
		email: string | undefined;
		userExists?: boolean;
		addresses: Address[] | undefined;
		type?: string;
		addressValid?: boolean;
		address?: Address;
		address_old?: Address;
		onDelete?: any;
		onSave?: any;
		onEditStart?: any;
		class?: string;
	}

	let {
		email,
		userExists = false,
		addresses,
		type = $bindable('text'),
		addressValid = $bindable(false),
		address = $bindable(newAddress()),
		address_old = $bindable(newAddress()),
		onDelete = (isCloseOnly: boolean) => {
		if (isCloseOnly) {
			address = {...address_old};
			type = 'text';
		} else {
			address = {...newAddress()};
			addressValid = false;
			type='edit';
		}
	},
		onSave = (isChanged: boolean, addr: Address): boolean => {
		if (addr.phone?.startsWith('+91')) addr.phone = addr.phone.substring(3);
		let result = validateAddress(addr, !userExists);
		if (result) addressError = result;
		else addressError = undefined;
		if (!result) {
			address.phone = '+91' + (addr.phone || '');
			address = {...address};
			addressValid = true;
			return true;
		} else return false;
	},
		onEditStart = (): boolean => {
		addressValid = false;
		if (address.phone?.startsWith('+91')) address.phone = address.phone.substring(3);
		return true;
	},
		class: className = ''
	}: Props = $props();
	

	function toggleType() {
		let k = true;
		if (type == 'edit') k = onSave(!compareAddress(address_old, address), address);
		if (type == 'text') {
			address_old = { ...address };
			k = onEditStart();
		}
		if (k) type = type == 'text' ? 'edit' : 'text';
	}

	let showAddressList = $state(false);
	let addressCount = addresses?.length ?? 0;

	//default behavior
	if (!userExists) type = 'edit';
	else {
		if (addresses && addressCount) {
			address = addresses[0];
			type = 'text';
		} else type = 'edit';
	}

	// Input styling
	const inputClasses = "w-full px-4 py-3 bg-[#252525]/80 rounded-lg border border-[#353535] focus:border-accent/50 focus:ring-1 focus:ring-accent/30 outline-hidden text-white placeholder-gray-500 transition-all";
</script>

<div class="bg-[#151515]/30 rounded-xl border border-[#252525] overflow-hidden transition-all duration-300">
	<!-- Header Section -->
	<div class="flex justify-between items-center p-4 border-b border-[#252525]">
		<div class="flex items-center gap-2">
			<button 
				class="group flex items-center gap-2 focus:outline-hidden"
				onclick={() => {
					if (userExists && addressCount) {
						showAddressList = !showAddressList;
					}
				}}
			>
				<span class="text-lg font-medium group-hover:text-accent transition-colors">
					Shipping Address
				</span>
				
				{#if userExists && addressCount}
					<div class="text-accent/70 transition-transform duration-300 group-hover:text-accent" class:rotate-180={showAddressList}>
						<Icon icon="ph:caret-down-bold" />
					</div>
				{/if}
			</button>
			
			{#if addressError}
				<span class="text-red-400 text-sm ml-2 animate-pulse">
					{addressError}
				</span>
			{/if}
		</div>
		
		<div class="flex items-center gap-2">
			<button
				class="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
				onclick={toggleType}
				aria-label={type === 'text' ? 'Edit address' : 'Save address'}
			>
				<Icon icon={type === 'text' ? 'ph:pencil-bold' : 'ph:check-bold'} class="text-xl" />
			</button>
			
			<button
				class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
				onclick={onDeleteLocal}
				aria-label={type === 'edit' && address.id ? 'Cancel edit' : 'Delete address'}
			>
				<Icon 
					icon={type === 'edit' && address.id ? 'ph:x-bold' : 'ph:trash-bold'} 
					class="text-xl" 
				/>
			</button>
		</div>
	</div>
	
	<!-- Address Content -->
	<div class="p-5">
		{#if !showAddressList}
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
					
					{#if address.email && !email}
						<div class="flex items-center mt-2">
							<Icon icon="ph:envelope-bold" class="mr-2 text-accent/50" />
							<span>{address.email}</span>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Edit mode with form fields -->
				<div class="space-y-4">
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
					
					<!-- Phone and Email in a row -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
									class="{inputClasses} pl-18"
									placeholder="Phone number"
									bind:value={address.phone}
								/>
							</div>
						</div>
						
						{#if !email}
							<div>
								<label for="email" class="text-sm font-medium text-gray-400 mb-1 block">Email</label>
								<div class="relative">
									<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent/70">
										<Icon icon="ph:envelope-bold" />
									</div>
									<input
										id="email"
										type="email"
										class="{inputClasses} pl-10"
										placeholder="Email address"
										bind:value={address.email}
									/>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{:else if addresses && addresses.length > 0}
			<!-- Address list for selection -->
			<div class="max-h-80 overflow-y-auto pr-1 scrollbar">
				{#each addresses as addrItem, i}
					<button
						class="flex flex-col w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-accent/5 mb-2 border border-[#353535] hover:border-accent/30"
						onclick={() => {
							address = addrItem;
							showAddressList = false;
							addressValid = true;
							type = 'text';
						}}
					>
						<div class="text-lg font-medium text-accent">{addrItem.name || ''}</div>
						<div class="text-gray-300">{addrItem.line1 || ''}</div>
						<div class="text-gray-300">{addrItem.line2 || ''}</div>
						<div class="text-gray-300">
							{addrItem.city || ''} - {addrItem.pincode || ''}, {addrItem.state || ''}
						</div>
						{#if addrItem.phone}
							<div class="text-gray-300 flex items-center gap-1 mt-1">
								<Icon icon="ph:phone-bold" class="text-accent/50" />
								<span>+91 {addrItem.phone.startsWith('+91') ? addrItem.phone.substring(3) : addrItem.phone}</span>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="p-4 text-center text-red-400">
				<Icon icon="ph:warning-circle" class="text-3xl mb-2" />
				<p>Unknown error occurred, please refresh the page.</p>
			</div>
		{/if}
	</div>
</div>

<style>
  /* Scrollbar styling */
  .scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollbar::-webkit-scrollbar-track {
    background: #252525;
    border-radius: 10px;
  }
  
  .scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-accent);
    border-radius: 10px;
    opacity: 0.5;
  }
  
  .scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-accent);
    opacity: 0.7;
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .5; }
  }
</style>
