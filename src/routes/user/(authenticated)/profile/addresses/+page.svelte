<script lang="ts">
	import { setLoading } from '$lib/client/loading.js';
	import { validateAddress, type Address } from '$lib/types/product.js';
	import AddressInput from '$lib/components/fundamental/AddressInput.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { tick } from 'svelte';
	import { ScButton, Skeleton } from '$lib/components/sc';
	import Plus from '@lucide/svelte/icons/plus';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import X from '@lucide/svelte/icons/x';

	let { data } = $props();

	let errorMsg = $state('');
	let errorShow = $state(false);
	let editing = $state<boolean[]>([]);
	let addresses = $state<Address[]>([]);
	let timeoutId = $state<NodeJS.Timeout | undefined>(undefined);
	let isLoading = $state(false);
	let isConfirmDialogOpen = $state(false);
	let addressIndexToDelete = $state<number | null>(null);

	const load_store = getContext<Writable<boolean>>('loading');

	$effect(() => {
		const unsubscribe = load_store.subscribe((value) => {
			isLoading = value;
		});
		return unsubscribe;
	});

	function setCtxLoading(loading: boolean) {
		setLoading(load_store, loading);
	}

	$effect(() => {
		return () => clearTimeout(timeoutId);
	});

	$effect(() => {
		setup();
	});

	function showError(message: string) {
		errorMsg = message;
		errorShow = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function isEditingAny(): boolean {
		return editing.includes(true);
	}

	async function setup() {
		setCtxLoading(true);
		errorShow = false;
		try {
			const result = await data.supabase_lt
				.from('addresses')
				.select('*')
				.order('created_at', { ascending: false });

			if (result.error) {
				showError(`Failed to load addresses: ${result.error.message}`);
				addresses = [];
				editing = [];
			} else {
				const fetchedAddresses = (result.data as Address[]) || [];
				addresses = fetchedAddresses;
				editing = new Array(fetchedAddresses.length).fill(false);
			}
		} catch {
			showError('An unexpected error occurred while loading addresses.');
			addresses = [];
			editing = [];
		} finally {
			setCtxLoading(false);
		}
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
		document.querySelector('[data-address-item]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

		setCtxLoading(true);
		errorShow = false;
		try {
			const { error } = await data.supabase_lt.from('addresses').delete().eq('id', addrToDelete.id);
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
			setCtxLoading(false);
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
				setCtxLoading(false);
			}
		}

		if (!finalAddress.name || !finalAddress.line1 || !finalAddress.city || !finalAddress.pincode || !finalAddress.state) {
			showError('Please fill in all required fields.');
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
			setCtxLoading(false);
		}
	}
</script>

<div class="space-y-4">
	<div class="flex justify-end">
		<ScButton
			variant="secondary"
			class="gap-1.5"
			onclick={addNewAddressEntry}
			disabled={isLoading || isEditingAny()}
		>
			<Plus class="size-3.5" />
			Add address
		</ScButton>
	</div>

	{#if errorShow}
		<div
			role="alert"
			class="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
		>
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span class="flex-1">{errorMsg}</span>
			<button
				onclick={() => (errorShow = false)}
				class="shrink-0 text-destructive/70 hover:text-destructive"
				aria-label="Dismiss error"
			>
				<X class="size-4" />
			</button>
		</div>
	{/if}

	{#if addresses.length === 0 && !isLoading}
		<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">No addresses saved.</p>
			<ScButton variant="secondary" class="mt-3" onclick={addNewAddressEntry} disabled={isEditingAny()}>
				Add address
			</ScButton>
		</div>
	{:else if addresses.length > 0}
		<div class="space-y-3">
			{#each addresses as address, i (address.id ?? `new-${i}`)}
				<div data-address-item>
					<AddressInput
						{address}
						bind:isEditing={editing[i]}
						onEdit={() => handleEditRequest(i)}
						onSave={async (addrToSave, changed) =>
							await handleSaveRequest(i, addrToSave, changed)}
						onDelete={() => handleDeleteRequest(i)}
						onCancel={() => handleCancelEdit(i)}
					/>
				</div>
			{/each}
		</div>
	{/if}

	{#if isLoading && addresses.length === 0}
		<div class="space-y-3" aria-hidden="true">
			{#each { length: 2 } as _, i (i)}
				<div class="rounded-md border border-border bg-card p-4">
					<Skeleton class="mb-2 h-4 w-1/3 rounded-sm" />
					<div class="space-y-2">
						<Skeleton class="h-3 w-5/6 rounded-sm" />
						<Skeleton class="h-3 w-2/3 rounded-sm" />
					</div>
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
		onCancel={() => (addressIndexToDelete = null)}
	/>
{/if}
