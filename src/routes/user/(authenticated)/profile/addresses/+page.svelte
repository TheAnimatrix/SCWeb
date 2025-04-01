<script lang="ts">
	// Import necessary modules
	import { setLoading } from '$lib/client/loading.js';
	import { compareAddress, validateAddress, type Address } from '$lib/types/product.js';
	import AddressInput from '$lib/components/fundamental/AddressInput.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Icon from '@iconify/svelte';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { tick } from 'svelte';
	
	// Use Svelte 5 props
	let { data } = $props();
	
	// State variables
	let errorMsg = $state('');
	let errorShow = $state(false);
	let editing = $state<boolean[]>([]);
	let addresses = $state<Address[]>([]);
	let timeoutId = $state<NodeJS.Timeout | undefined>(undefined);
	let isLoading = $state(false);
	let isConfirmDialogOpen = $state(false);
	let addressIndexToDelete = $state<number | null>(null);
	
	// Get loading store from context
	const load_store = getContext<Writable<boolean>>('loading');

	// Keep local isLoading in sync with the store
	$effect(() => {
		const unsubscribe = load_store.subscribe(value => {
			isLoading = value;
		});
		return unsubscribe;
	});

	// Helper to set loading state via context store
	function setCtxLoading(loading: boolean) {
		setLoading(load_store, loading);
	}

	// Watch for error state changes and set timeout to hide errors
	// $effect(() => {
	// 	if (errorShow) {
	// 		clearTimeout(timeoutId);
	// 		timeoutId = setTimeout(() => {
	// 			errorShow = false;
	// 		}, 6000);
	// 	} else {
	// 		clearTimeout(timeoutId);
	// 	}
	// });

	$effect(() => {
		return () => {
			clearTimeout(timeoutId);
		};
	});

	// Load initial data when the component mounts
	$effect(() => {
		setup();
	});

	// Utility functions
	function showError(message: string) {
		errorMsg = message;
		errorShow = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function isEditingAny(): boolean {
		return editing.includes(true);
	}

	// Load addresses from the database
	async function setup() {
		setCtxLoading(true);
		errorShow = false;
		try {
			const result = await data.supabase_lt
				.from('addresses')
				.select('*')
				.order('created_at', { ascending: false });

			if (result.error) {
				console.error('Supabase error fetching addresses:', result.error);
				showError(`Failed to load addresses: ${result.error.message}`);
				addresses = [];
				editing = [];
			} else {
				const fetchedAddresses = result.data as Address[] || [];
				addresses = fetchedAddresses;
				editing = new Array(fetchedAddresses.length).fill(false);
			}

		} catch (error) {
			console.error('Error in setup:', error);
			showError('An unexpected error occurred while loading addresses.');
			addresses = [];
			editing = [];
		} finally {
			setCtxLoading(false);
		}
	}

	// Handle adding a new (empty) address entry to the UI
	async function addNewAddressEntry() {
		if (isEditingAny()) {
			showError('Please save or cancel the address currently being edited before adding a new one.');
			return;
		}

		addresses = [{ /* Empty placeholder */ }, ...addresses];
		editing = [true, ...editing];
		errorShow = false;

		await tick();
		const firstAddressElement = document.querySelector('[data-address-item]');
		if (firstAddressElement) {
			firstAddressElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	// Handle the request to start editing an address (from AddressInput)
	function handleEditRequest(index: number): boolean {
		if (isEditingAny()) {
			showError('Please save or cancel the address currently being edited before editing another.');
			return false;
		}
		editing = editing.map((val, i) => i === index);
		errorShow = false;
		return true;
	}

	async function handleCancelEdit(index: number) {
		const address = addresses[index];
		if (!address.id) {
			addresses.splice(index, 1);
			editing.splice(index, 1);
			addresses = [...addresses];
			editing = [...editing];
		} else {
			editing = editing.with(index, false);
		}
		errorShow = false;
		await tick();
	}

	async function handleDeleteRequest(index: number) {
		const addrToDelete = addresses[index];

		if (!addrToDelete?.id) {
			handleCancelEdit(index);
			return;
		}

		if (isEditingAny()) {
			showError('Please save or cancel the current edit before deleting.');
			return;
		}

		// Show confirmation dialog instead of window.confirm
		addressIndexToDelete = index;
		isConfirmDialogOpen = true;
	}

	// New function to handle the actual deletion after confirmation
	async function confirmDelete() {
		if (addressIndexToDelete === null) return;
		
		const index = addressIndexToDelete;
		const addrToDelete = addresses[index];
		addressIndexToDelete = null; // Reset index

		if (!addrToDelete?.id) {
			// This case should ideally not happen if dialog was triggered correctly
			// but handle it defensively by attempting to cancel/remove the entry
			handleCancelEdit(index);
			return;
		}

		setCtxLoading(true);
		errorShow = false;
		try {
			const { error } = await data.supabase_lt
				.from('addresses')
				.delete()
				.eq('id', addrToDelete.id);

			if (error) {
				console.error('Supabase error deleting address:', error);
				showError(`Error deleting address: ${error.message}`);
			} else {
				addresses.splice(index, 1);
				editing.splice(index, 1);
				addresses = [...addresses];
				editing = [...editing];
			}
		} catch (error) {
			console.error('Error in confirmDelete:', error);
			showError('An unexpected error occurred while deleting the address.');
		} finally {
			setCtxLoading(false);
		}
	}

	async function handleSaveRequest(index: number, addressToSave: Address, isChanged: boolean): Promise<boolean> {
		errorShow = false;

		const finalAddress = { ...addressToSave, phone: addressToSave.phone || undefined };
		const validationError = validateAddress(finalAddress);
		if (validationError) {
			showError(validationError);
			return false;
		}

		const isUpdate = !!finalAddress.id;

		if (isUpdate) {
			if (!isChanged) {
				editing = editing.with(index, false);
				return true;
			}

			setCtxLoading(true);
			try {
				const { id, created_at, ...updateData } = finalAddress;

				const { data: dbData, error } = await data.supabase_lt
					.from('addresses')
					.update(updateData)
					.eq('id', id)
					.select()
					.single();

				if (error) {
					console.error('Supabase error updating address:', error);
					showError(`Error updating address: ${error.message}`);
					return false;
				}

				if (dbData) {
					addresses = addresses.with(index, dbData as Address);
					editing = editing.with(index, false);
					return true;
				} else {
					showError('Failed to update address. Address not found or no changes made.');
					editing = editing.with(index, false);
					return true;
				}

			} catch (error) {
				console.error('Error in handleSaveRequest (update):', error);
				showError('An unexpected error occurred while updating the address.');
				return false;
			} finally {
				setCtxLoading(false);
			}

		} else {
			if (!finalAddress.name || !finalAddress.line1 || !finalAddress.city || !finalAddress.pincode || !finalAddress.state ) {
				 showError('Please fill in all required address fields.');
				 return false;
			}

			setCtxLoading(true);
			try {
				const { id, ...insertData } = finalAddress;

				const { data: dbData, error } = await data.supabase_lt
					.from('addresses')
					.insert([insertData])
					.select()
					.single();

				if (error) {
					console.error('Supabase error inserting address:', error);
					showError(`Error saving new address: ${error.message}`);
					return false;
				}

				if (dbData) {
					addresses = addresses.with(index, dbData as Address);
					editing = editing.with(index, false);
					return true;
				} else {
					showError('Failed to save new address (no data returned). Please try again.');
					return false;
				}

			} catch (error) {
				console.error('Error in handleSaveRequest (insert):', error);
				showError('An unexpected error occurred while saving the new address.');
				return false;
			} finally {
				setCtxLoading(false);
			}
		}
	}
</script>

<div class="space-y-6">
	<!-- Add Address Button -->
	<div class="flex justify-between items-center">
		<button
			class="flex items-center gap-2 px-6 py-3 bg-[#151515] hover:bg-white/10 rounded-xl transition-all text-accent disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={addNewAddressEntry}
			disabled={isLoading || isEditingAny()}
		>
			<Icon icon="ph:plus-circle-bold" class="text-xl" />
			<span class="font-medium">Add New Address</span>
		</button>
	</div>

	<!-- Error Message -->
	{#if errorShow}
		<div role="alert" class="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-400 flex items-center gap-3 shadow-md">
			<Icon icon="ph:warning-octagon-fill" class="text-xl shrink-0 text-red-500" />
			<span class="flex-grow">{errorMsg}</span>
			<button
				onclick={() => errorShow = false}
				class="ml-auto p-1 text-red-400/70 hover:text-red-300 hover:bg-red-500/20 rounded-full"
				aria-label="Dismiss error"
			>
				<Icon icon="ph:x-bold" class="text-lg" />
			</button>
		</div>
	{/if}

	<!-- Address List -->
	<div class="grid gap-6">
		{#if addresses.length === 0 && !isLoading}
			<div class="bg-[#151515]/80 rounded-xl p-8 text-center border border-[#252525]">
				<Icon icon="ph:map-pin-line" class="text-4xl text-gray-500 mx-auto mb-4" />
				<p class="text-gray-400">You haven't added any addresses yet.</p>
				<button
					class="inline-block mt-6 px-6 py-2 bg-accent hover:bg-accent/80 text-black font-medium rounded-lg transition-all"
					onclick={addNewAddressEntry}
					disabled={isEditingAny()}
				>
					Add Your First Address
				</button>
			</div>
		{:else if addresses.length > 0}
			{#each addresses as address, i (address.id ?? `new-${i}`)}
				<div data-address-item class="bg-[#151515]/50 rounded-xl overflow-hidden backdrop-blur-md border border-[#252525] focus-within:border-accent/50 transition-colors duration-200">
					<AddressInput
						{address}
						bind:isEditing={editing[i]}
						onEdit={() => handleEditRequest(i)}
						onSave={async (addrToSave, changed) => await handleSaveRequest(i, addrToSave, changed)}
						onDelete={() => handleDeleteRequest(i)}
						onCancel={() => handleCancelEdit(i)}
					/>
				</div>
			{/each}
		{/if}

		{#if isLoading && addresses.length === 0}
			{#each { length: 2 } as _}
				<div class="bg-[#151515]/50 rounded-xl p-4 border border-[#252525] animate-pulse space-y-3">
					<div class="h-5 bg-gray-700/50 rounded w-1/3"></div>
					<div class="flex gap-2">
						 <div class="w-6 h-6 bg-gray-700/50 rounded shrink-0"></div>
						 <div class="space-y-2 flex-grow">
							<div class="h-4 bg-gray-700/50 rounded w-5/6"></div>
							<div class="h-4 bg-gray-700/50 rounded w-3/4"></div>
							<div class="h-4 bg-gray-700/50 rounded w-1/2"></div>
						 </div>
					</div>
					<div class="flex gap-2 items-center">
						<div class="w-6 h-6 bg-gray-700/50 rounded shrink-0"></div>
						<div class="h-4 bg-gray-700/50 rounded w-1/3"></div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Confirmation Dialog -->
{#if addressIndexToDelete !== null}
	<ConfirmDialog
		bind:open={isConfirmDialogOpen}
		title="Delete Address"
		message={`Are you sure you want to delete the address "${addresses[addressIndexToDelete]?.name || 'Unnamed'}"? This action cannot be undone.`}
		confirmText="Delete"
		onConfirm={confirmDelete}
		onCancel={() => addressIndexToDelete = null}
	/>
{/if}

<style>
	:global(.animate_base) {
		@apply transition-all duration-200;
	}
</style>
