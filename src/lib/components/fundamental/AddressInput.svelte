<script lang="ts">
	import { type Address, compareAddress, getValidState } from '$lib/types/product';
	import Icon from '@iconify/svelte';

	// --- Props ---
	interface Props {
		address: Address;          // The address data to display/edit
		isEditing: boolean;        // Controlled by the parent
		class?: string;            // Optional CSS class
		onEdit?: () => boolean;    // Callback BEFORE entering edit mode (parent can prevent)
		onSave?: (addr: Address, isChanged: boolean) => Promise<boolean> | boolean; // Callback to save (parent handles logic, returns promise/bool indicating success)
		onDelete?: () => void;     // Callback to delete
		onCancel?: () => void;     // Callback to cancel edit
	}

	let {
		address,
		isEditing = $bindable(false), // Parent controls this via bind:isEditing
		class: className = '',
		// Default handlers (useful for standalone testing, but parent provides real ones)
		onEdit = () => { console.warn('AddressInput: onEdit handler not provided'); return true; },
		onSave = async (addr, isChanged) => { console.warn('AddressInput: onSave handler not provided', { addr, isChanged }); return true; },
		onDelete = () => { console.warn('AddressInput: onDelete handler not provided'); },
		onCancel = () => { console.warn('AddressInput: onCancel handler not provided'); }
	}: Props = $props();

	// --- State ---
	// Local copy of the address for editing to avoid directly mutating the prop
	let editableAddress = $state<Address>({});
	// Store the original address when editing starts to compare for changes
	let originalAddress = $state<Address>({});

	// --- Utility ---
	function getWithoutCountryCode(phone: string | undefined): string {
		if (!phone) return '';
		// Handles cases like "+91123", "91123", "123" -> "123"
		if (phone.startsWith('+91')) return phone.substring(3);
		if (phone.startsWith('91') && phone.length > 10) return phone.substring(2); // Avoids stripping "91" from a 10-digit number starting with 91
		return phone;
	}

	// --- Effects ---
	// Sync local state when edit mode changes or the address prop itself changes
	$effect(() => {
		if (isEditing) {
			// Store original and create editable copy ONLY if not already matching current address
			// This prevents unnecessary resets if the parent re-renders but address is the same
			if (address.id !== originalAddress.id || !compareAddress(address, originalAddress)) {
				originalAddress = { ...address };
				editableAddress = { ...address };
				// Remove country code for editing display
				if (editableAddress.phone) {
					editableAddress.phone = getWithoutCountryCode(editableAddress.phone);
				}
			}
		}
		// No 'else' needed - editableAddress is only relevant *during* editing.
        // Parent controls `isEditing`, and data flows down via `address`.
	});

	// --- Event Handlers ---

	// Called when the user clicks the 'Edit' icon (pencil)
	function handleEditRequest() {
		const canEdit = onEdit(); // Ask parent if editing is allowed now
		if (canEdit) {
			isEditing = true; // Update bindable prop, parent state will reflect this
		}
	}

	// Called when the user clicks the 'Save' icon (check)
	async function handleSaveRequest() {
		// Prepare the address data to be saved
		let addressToSave = { ...editableAddress };

		// Ensure state abbreviation is valid before saving (optional, based on getValidState behavior)
		if (addressToSave.state && addressToSave.state.length > 0) {
			const [validState] = getValidState(addressToSave.state);
			addressToSave.state = validState || addressToSave.state; // Use valid or keep original if not found/matched
		}

		// Format phone number: remove leading/trailing spaces, ensure +91 prefix
		if (addressToSave.phone) {
			let phoneNum = getWithoutCountryCode(addressToSave.phone.trim());
			if (phoneNum) { // Only add prefix if there's a number after cleaning
				addressToSave.phone = '+91' + phoneNum;
			} else {
				addressToSave.phone = undefined; // Treat empty/invalid input as no phone number
			}
		} else {
             addressToSave.phone = undefined; // Ensure empty string becomes undefined
        }


		const isChanged = !compareAddress(originalAddress, addressToSave);
		const savedSuccessfully = await onSave(addressToSave, isChanged); // Ask parent to save (could be async)

		if (savedSuccessfully) {
			isEditing = false; // Exit edit mode IF parent confirms save succeeded
		}
		// If save failed (e.g., validation error in parent), stay in edit mode. Parent should show error.
	}

	// Called when the user clicks the 'Delete' icon (trash)
	function handleDeleteRequest() {
		// Consider adding a confirmation dialog here for better UX
		onDelete(); // Tell parent to delete
		// Parent will handle state update / removal
	}

	// Called when the user clicks the 'Cancel' icon (X)
	function handleCancelRequest() {
		onCancel(); // Tell parent editing was cancelled
		isEditing = false; // Exit edit mode locally (parent might also update its state)
	}

	// Unique ID prefix for this instance (useful for labels/inputs)
	const uniqueId = `addr-${address.id || Math.random().toString(36).substring(2, 9)}`;

	const inputClasses = "w-full px-4 py-3 bg-[#252525]/80 rounded-lg border border-[#353535] focus:border-accent/50 focus:ring-1 focus:ring-accent/30 outline-none text-white placeholder-gray-400/70 transition-all"; // Adjusted placeholder color

</script>

<div class="{className} bg-[#151515]/30 rounded-xl border border-[#252525] overflow-hidden transition-all duration-300">
	<div class="flex justify-between items-start p-4 gap-4">
		{#if !isEditing}
			<!-- Read-only address display (using address prop) -->
			<div class="space-y-2 text-gray-300 flex-grow min-w-0">
				<div class="text-lg font-medium text-accent truncate">{address.name || 'Unnamed Address'}</div>

				<div class="flex items-start">
					<Icon icon="ph:map-pin-bold" class="mt-1 mr-2 text-accent/50 shrink-0" />
					<div class="space-y-1 text-sm">
						<div>{address.line1 || 'Address Line 1'}</div>
						{#if address.line2}<div>{address.line2}</div>{/if}
						<div>{address.city || 'City'} - {address.pincode || 'Pincode'}</div>
                        <div>{address.state || 'State'}</div>
					</div>
				</div>

				{#if address.phone}
					<div class="flex items-center mt-2 text-sm">
						<Icon icon="ph:phone-bold" class="mr-2 text-accent/50 shrink-0" />
						<span>+91 {getWithoutCountryCode(address.phone)}</span>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Edit mode with form fields (using editableAddress state) -->
			<div class="w-full space-y-4 flex-grow min-w-0">
				<!-- Name field -->
				<div>
					<label for="{uniqueId}-name" class="text-sm font-medium text-gray-400 mb-1 block">Full Name</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent/70 pointer-events-none">
							<Icon icon="ph:user-bold" />
						</div>
						<input
							id="{uniqueId}-name"
							type="text"
							class="{inputClasses} pl-9"
							placeholder="Enter your full name"
							bind:value={editableAddress.name}
						/>
					</div>
				</div>

				<!-- Address fields -->
				<div>
					<label for="{uniqueId}-line1" class="text-sm font-medium text-gray-400 mb-1 block">Address Line 1</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent/70 pointer-events-none">
							<Icon icon="ph:map-pin-bold" />
						</div>
						<input
							id="{uniqueId}-line1"
							type="text"
							class="{inputClasses} pl-9"
							placeholder="House No, Building, Street, Area"
							bind:value={editableAddress.line1}
						/>
					</div>
				</div>

				<div>
					<label for="{uniqueId}-line2" class="text-sm font-medium text-gray-400 mb-1 block">Address Line 2 <span class="text-xs text-gray-500">(Optional)</span></label>
					<input
						id="{uniqueId}-line2"
						type="text"
						class="{inputClasses}"
						placeholder="Landmark, Apt, Suite, Floor etc."
						bind:value={editableAddress.line2}
					/>
				</div>

				<!-- City, Pincode, State -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label for="{uniqueId}-city" class="text-sm font-medium text-gray-400 mb-1 block">City</label>
						<input
							id="{uniqueId}-city"
							type="text"
							class="{inputClasses}"
							placeholder="City"
							bind:value={editableAddress.city}
						/>
					</div>

					<div>
						<label for="{uniqueId}-pincode" class="text-sm font-medium text-gray-400 mb-1 block">Pincode</label>
						<input
							id="{uniqueId}-pincode"
							type="text"
							class="{inputClasses}"
							placeholder="6 digits"
							bind:value={editableAddress.pincode}
							maxlength="6"
                            pattern="\d{6}"
                            inputmode="numeric"
						/>
					</div>

					<div>
						<label for="{uniqueId}-state" class="text-sm font-medium text-gray-400 mb-1 block">State</label>
						<input
							id="{uniqueId}-state"
							type="text"
							class="{inputClasses}"
							placeholder="State"
							bind:value={editableAddress.state}
							maxlength="50"
						/>
					</div>
				</div>

				<!-- Phone field -->
				<div>
					<label for="{uniqueId}-phone" class="text-sm font-medium text-gray-400 mb-1 block">Phone Number</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent/70 pointer-events-none">
							<Icon icon="ph:phone-bold" />
						</div>
						<div class="absolute left-9 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
							+91
						</div>
						<input
							id="{uniqueId}-phone"
							type="tel"
							class="{inputClasses} pl-[4.25rem]"
							placeholder="10-digit mobile number"
							bind:value={editableAddress.phone}
                            maxlength="14"
                            pattern="\s*\d[\d\s]*"
                            inputmode="tel"
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex flex-col sm:flex-row gap-2 ml-auto shrink-0">
			{#if !isEditing}
				<button
					class="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
					onclick={handleEditRequest}
					aria-label="Edit address"
				>
					<Icon icon="ph:pencil-simple-line-bold" class="text-xl" />
				</button>
			{:else}
				<button
					class="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
					onclick={handleSaveRequest}
					aria-label="Save address"
				>
					<Icon icon="ph:check-bold" class="text-xl" />
				</button>
			{/if}

			<button
				class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
				onclick={isEditing ? handleCancelRequest : handleDeleteRequest}
				aria-label={isEditing ? 'Cancel edit' : 'Delete address'}
			>
				<Icon icon={isEditing ? 'ph:x-bold' : 'ph:trash-bold'} class="text-xl" />
			</button>
		</div>
	</div>
</div>

<style>
  /* Add smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms; /* Slightly faster */
  }
  /* Ensure inputs don't overflow */
  input {
	  min-width: 0;
  }
</style>
