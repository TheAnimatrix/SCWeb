<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onMount } from 'svelte';
	import FilamentFormModal from './FilamentFormModal.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { ScButton, TableBodySkeleton } from '$lib/components/sc';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Define the expected structure for a filament object (can be imported from a types file later)
	interface Filament {
		id?: string | number; // Optional ID for reactivity if available in the JSONB
		name: string;
		brand: string;
		material_type: string;
		color: string;
		quantity_kg: number;
		temp_key?: string | number; // Added for {#each} key
	}

	// Props expected from the parent component
	let {
		supabase_lt,
		session,
		onUpdate
	}: {
		supabase_lt: SupabaseClient;
		session: { data: { user: { id: string } } } | null;
		onUpdate: () => void;
	} = $props();

	// State for filament inventory
	let filamentInventory = $state<Filament[]>([]);
	let isLoadingFilaments = $state(false);
	let filamentError = $state<string | null>(null);

	// Modal State
	let isModalOpen = $state(false);
	let modalMode = $state<'add' | 'edit'>('add');
	let currentFilament = $state<Partial<Filament>>({}); // Filament being edited - Use correct interface

	// State for delete confirmation dialog
	let isDeleteDialogOpen = $state(false);
	let filamentToDelete = $state<Filament | null>(null);

	// LocalStorage key for disclaimer
	const disclaimerKey = 'filamentDisclaimerHidden';

	onMount(() => {
		if (typeof window !== 'undefined') {
			const hidden = localStorage.getItem(disclaimerKey);
			if (hidden === '1') {
				disclaimerVisible = false;
			} else {
				disclaimerVisible = true;
			}
		}
	});

	function hideDisclaimerPermanently() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(disclaimerKey, '1');
			disclaimerVisible = false;
		}
	}

	// Move fetchFilamentData to top-level for reuse
	async function fetchFilamentData() {
		if (session?.data?.user?.id) {
			isLoadingFilaments = true;
			filamentError = null;
			filamentInventory = [];

			try {
				const { data, error } = await supabase_lt
					.from('UserFilament')
					.select('*')
					.eq('owner_id', session?.data?.user?.id)
					.order('created_at', { ascending: false });

				if (error) {
					console.error('Error fetching filament data:', error);
					filamentError = `Failed to load filament data: ${error.message}`;
				} else if (Array.isArray(data)) {
					filamentInventory = data.map((item, index) => ({
						...item,
						temp_key: item.id || `filament-${index}-${Math.random()}`
					}));
				} else {
					filamentInventory = [];
				}
			} catch (e: any) {
				console.error('Exception fetching filament data:', e);
				filamentError = `An error occurred: ${e.message}`;
			} finally {
				isLoadingFilaments = false;
			}
		} else {
			filamentInventory = [];
			isLoadingFilaments = false;
			filamentError = null;
		}

		onUpdate();
	}

	$effect(() => {
		fetchFilamentData();
	});

	function openAddModal() {
		modalMode = 'add';
		currentFilament = {}; // Clear any previous edit data
		isModalOpen = true;
	}

	function openEditModal(filamentToEdit: Filament) {
		// Use correct interface
		modalMode = 'edit';
		// Create a copy to avoid direct mutation if needed, ensure all fields are present
		currentFilament = { ...filamentToEdit };
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		// Optionally reset currentFilament after a delay if needed
		// setTimeout(() => { currentFilament = {}; }, 300);
	}

	// Update handleSaveFilament to insert/update UserFilament
	async function handleSaveFilament(savedData: any) {
		if (!session?.data?.user?.id) return;
		let isEdit = Boolean(savedData.id);
		let payload = {
			name: savedData.name,
			brand: savedData.brand,
			material_type: savedData.type,
			color: savedData.color,
			quantity_kg: savedData.quantity_kg,
			cost_approx: savedData.cost_kg,
			product_link: savedData.product_link,
			owner_id: session?.data?.user?.id
		};
		let result;
		if (isEdit) {
			const { error } = await supabase_lt
				.from('UserFilament')
				.update(payload)
				.eq('id', savedData.id);
			result = { error };
		} else {
			const { error } = await supabase_lt.from('UserFilament').insert([payload]);
			result = { error };
		}
		if (!result.error) {
			await fetchFilamentData();
			closeModal();
		} else {
			filamentError = result.error.message;
		}
	}

	// Update handleDeleteFilament to delete from UserFilament
	async function handleDeleteFilament(filamentToDelete: any) {
		if (!filamentToDelete.id) return;
		const { error } = await supabase_lt.from('UserFilament').delete().eq('id', filamentToDelete.id);
		if (!error) {
			await fetchFilamentData();
		} else {
			filamentError = error.message;
		}
	}

	function askDeleteFilament(filament: Filament) {
		filamentToDelete = filament;
		isDeleteDialogOpen = true;
	}

	function confirmDeleteFilament() {
		if (filamentToDelete) {
			handleDeleteFilament(filamentToDelete);
		}
		isDeleteDialogOpen = false;
		filamentToDelete = null;
	}

	function cancelDeleteFilament() {
		isDeleteDialogOpen = false;
		filamentToDelete = null;
	}

	let disclaimerVisible = $state(false);
</script>

<!-- Filament Management Section -->
<PortalCard>
	<PortalSectionLabel label="filament_inventory" class="mb-4" />

	<div class="mb-4 rounded-md border border-border bg-muted/20 p-4">
		<button
			type="button"
			class="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
			onclick={() => (disclaimerVisible = !disclaimerVisible)}
		>
			<Icon
				icon={disclaimerVisible ? 'ph:caret-down-bold' : 'ph:caret-right-bold'}
				class="text-xs text-muted-foreground"
			/>
			<span class="font-mono text-xs">important_disclaimer</span>
		</button>

		{#if disclaimerVisible}
			<div
				class="mt-3 flex flex-col gap-y-2"
				in:slide={{ duration: 200, easing: cubicOut }}
				out:slide={{ duration: 200, easing: cubicOut }}
			>
				{#each [
					'You will not be displayed on the marketplace if you have no filaments in your inventory',
					'Only the colors you have in your inventory will be displayed in the marketplace',
					'Only the material types you have in your inventory will be displayed in the marketplace',
					'Please keep your inventory updated to avoid wasting customer time'
				] as item, index}
					<p class="flex items-start gap-2 text-sm text-muted-foreground">
						<span
							class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-xs text-foreground"
						>
							{index + 1}
						</span>
						<span>{item}</span>
					</p>
				{/each}
				<button
					type="button"
					class="mt-2 self-end rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onclick={hideDisclaimerPermanently}
				>
					don't_show_again
				</button>
			</div>
		{/if}
	</div>

	<div class="overflow-x-auto rounded-md border border-border">
		<table class="min-w-full divide-y divide-border text-left">
			<thead class="bg-muted/30">
				<tr>
					<th
						scope="col"
						class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
					>
						Name
					</th>
					<th
						scope="col"
						class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
					>
						Brand
					</th>
					<th
						scope="col"
						class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
					>
						Type
					</th>
					<th
						scope="col"
						class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
					>
						Color
					</th>
					<th
						scope="col"
						class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
					>
						Quantity (kg)
					</th>
					<th
						scope="col"
						class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
					>
						Actions
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border">
				{#if isLoadingFilaments}
					<TableBodySkeleton rows={4} columns={6} />
				{:else}
					{#each filamentInventory as filament (filament.temp_key)}
						<tr class="transition-colors hover:bg-muted/20">
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">{filament.name}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
								>{filament.brand || 'N/A'}</td
							>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
								>{filament.material_type || 'N/A'}</td
							>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="inline-block size-4 rounded-full border border-border"
										style="background-color: {filament.color || '#ffffff'};"
									></span>
									<span class="font-mono text-xs text-muted-foreground"
										>{filament.color || 'N/A'}</span
									>
								</div>
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
								>{filament.quantity_kg ?? 'N/A'}</td
							>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">
								<Button
									variant="ghost"
									size="icon"
									class="rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
									onclick={() => openEditModal(filament)}
									aria-label="Edit filament"
								>
									<Icon icon="ph:pencil-simple-line-bold" class="text-lg" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="ml-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
									onclick={() => askDeleteFilament(filament)}
									aria-label="Delete filament"
								>
									<Icon icon="ph:trash-bold" class="text-lg" />
								</Button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-4 py-10 text-center text-sm text-muted-foreground">
								<div class="flex flex-col items-center gap-3">
									<Icon icon="mdi:database-off-outline" class="size-10 text-muted-foreground" />
									<span>
										{filamentError ? filamentError : 'Your filament inventory is empty.'}
									</span>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<div class="mt-4 flex justify-end">
		<ScButton variant="secondary" onclick={openAddModal}>
			<Plus class="mr-1.5 size-4" strokeWidth={1.5} />
			Add filament
		</ScButton>
	</div>
</PortalCard>
<!-- End Filament Management Section -->

<!-- Modal Component -->
<FilamentFormModal
	bind:isOpen={isModalOpen}
	mode={modalMode}
	bind:filament={currentFilament}
	onSave={handleSaveFilament}
	onClose={closeModal}
	{supabase_lt} />

<ConfirmDialog
	bind:open={isDeleteDialogOpen}
	title="Delete Filament?"
	message="Are you sure you want to delete this filament? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	onConfirm={confirmDeleteFilament}
	onCancel={cancelDeleteFilament} />
