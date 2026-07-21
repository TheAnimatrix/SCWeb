<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { validateAddress, type Address } from '$lib/types/product.js';
	import AddressInput from '$lib/components/fundamental/AddressInput.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import { tick } from 'svelte';
	import { ScButton } from '$lib/components/sc';
			
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';

	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	let errorMsg = $state('');
	let errorShow = $state(false);
	let addresses = $state<Address[]>([]);
	addresses = data.addresses;
	let editing = $state<boolean[]>([]);
	editing = data.editing;
	let timeoutId = $state<ReturnType<typeof setTimeout> | undefined>(undefined);
	let isLoading = $state(false);
	let isConfirmDialogOpen = $state(false);
	let addressIndexToDelete = $state<number | null>(null);

	$effect(() => {
		return () => clearTimeout(timeoutId);
	});

	function showError(message: string) {
		errorMsg = message;
		errorShow = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function isEditingAny(): boolean {
		return editing.includes(true);
	}

	async function addNewAddressEntry() {
		if (isEditingAny()) {
			showError('Save or cancel the current edit first.');
			return;
		}

		addresses = [{} as Address, ...addresses];
		editing = [true, ...editing];
		errorShow = false;

		await tick();
		document
			.querySelector('[data-address-item]')
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function handleEditRequest(index: number): boolean {
		if (isEditingAny()) {
			showError('Save or cancel the current edit first.');
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
			showError('Save or cancel the current edit first.');
			return;
		}
		addressIndexToDelete = index;
		isConfirmDialogOpen = true;
	}

	async function confirmDelete() {
		if (addressIndexToDelete === null) return;

		const index = addressIndexToDelete;
		const addrToDelete = addresses[index];
		addressIndexToDelete = null;

		if (!addrToDelete?.id) {
			handleCancelEdit(index);
			return;
		}

		isLoading = true;
		errorShow = false;
		try {
			const { error } = await supabase().from('addresses').delete().eq('id', addrToDelete.id);
			if (error) {
				showError(`Error deleting address: ${error.message}`);
			} else {
				addresses.splice(index, 1);
				editing.splice(index, 1);
				addresses = [...addresses];
				editing = [...editing];
			}
		} catch {
			showError('An unexpected error occurred while deleting.');
		} finally {
			isLoading = false;
		}
	}

	async function handleSaveRequest(
		index: number,
		addressToSave: Address,
		isChanged: boolean
	): Promise<boolean> {
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

			isLoading = true;
			try {
				const id = finalAddress.id;
				const updateData = { ...finalAddress };
				delete updateData.id;
				delete updateData.created_at;
				const { data: dbData, error } = await supabase()
					.from('addresses')
					.update(updateData)
					.eq('id', id)
					.select()
					.single();

				if (error) {
					showError(`Error updating address: ${error.message}`);
					return false;
				}

				if (dbData) {
					addresses = addresses.with(index, dbData as Address);
					editing = editing.with(index, false);
					return true;
				}

				showError('Failed to update address.');
				editing = editing.with(index, false);
				return true;
			} catch {
				showError('An unexpected error occurred while updating.');
				return false;
			} finally {
				isLoading = false;
			}
		}

		if (
			!finalAddress.name ||
			!finalAddress.line1 ||
			!finalAddress.city ||
			!finalAddress.pincode ||
			!finalAddress.state
		) {
			showError('Please fill in all required fields.');
			return false;
		}

		isLoading = true;
		try {
			const insertData = { ...finalAddress };
			delete insertData.id;
			const { data: dbData, error } = await supabase()
				.from('addresses')
				.insert([insertData])
				.select()
				.single();

			if (error) {
				showError(`Error saving address: ${error.message}`);
				return false;
			}

			if (dbData) {
				addresses = addresses.with(index, dbData as Address);
				editing = editing.with(index, false);
				return true;
			}

			showError('Failed to save address.');
			return false;
		} catch {
			showError('An unexpected error occurred while saving.');
			return false;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex justify-end">
		<ScButton
			variant="secondary"
			class="gap-1.5"
			onclick={addNewAddressEntry}
			disabled={isLoading || isEditingAny()}>
			<Icon icon={F.add} class="size-3.5" />
			Add address
		</ScButton>
	</div>

	{#if errorShow}
		<div
			role="alert"
			class="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
			<Icon icon={F.errorCircle} class="mt-0.5 size-4 shrink-0" />
			<span class="flex-1">{errorMsg}</span>
			<button
				onclick={() => (errorShow = false)}
				class="shrink-0 text-destructive/70 hover:text-destructive"
				aria-label="Dismiss error">
				<Icon icon={F.dismiss} class="size-4" />
			</button>
		</div>
	{/if}

	{#if addresses.length === 0 && !isLoading}
		<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">No addresses saved.</p>
			<ScButton
				variant="secondary"
				class="mt-3"
				onclick={addNewAddressEntry}
				disabled={isEditingAny()}>
				Add address
			</ScButton>
		</div>
	{:else if addresses.length > 0}
		<div class="space-y-3">
			{#each addresses as address, i (address.id ?? `new-${i}`)}
				<div data-address-item>
					<AddressInput
						{address}
						isEditing={editing[i]}
						onEdit={() => handleEditRequest(i)}
						onSave={async (addrToSave, changed) => await handleSaveRequest(i, addrToSave, changed)}
						onDelete={() => handleDeleteRequest(i)}
						onCancel={() => handleCancelEdit(i)} />
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if addressIndexToDelete !== null}
	<ConfirmDialog
		bind:open={isConfirmDialogOpen}
		title="Delete Address"
		message={`Delete "${addresses[addressIndexToDelete]?.name || 'Unnamed'}"? This cannot be undone.`}
		confirmText="Delete"
		onConfirm={confirmDelete}
		onCancel={() => (addressIndexToDelete = null)} />
{/if}
