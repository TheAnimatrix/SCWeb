<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import type { SupabaseClient, Session } from '@supabase/supabase-js';
	import { onMount } from 'svelte'; // Or use $effect if preferred
	import FilamentFormModal from './FilamentFormModal.svelte'; // Import the modal
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';

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
	let { supabase_lt, session }: { supabase_lt: SupabaseClient, session: Session | null } = $props();

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

	// Move fetchFilamentData to top-level for reuse
	async function fetchFilamentData() {
		if (session?.user?.id) {
			isLoadingFilaments = true;
			filamentError = null;
			filamentInventory = [];

			try {
				const { data, error } = await supabase_lt
					.from('UserFilament')
					.select('*')
					.eq('owner_id', session.user.id)
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
	}

	$effect(() => {
		fetchFilamentData();
	});

	function openAddModal() {
		modalMode = 'add';
		currentFilament = {}; // Clear any previous edit data
		isModalOpen = true;
	}

	function openEditModal(filamentToEdit: Filament) { // Use correct interface
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
		if (!session?.user?.id) return;
		let isEdit = Boolean(savedData.id);
		let payload = {
			name: savedData.name,
			brand: savedData.brand,
			material_type: savedData.type,
			color: savedData.color,
			quantity_kg: savedData.quantity_kg,
			cost_approx: savedData.cost_kg,
			product_link: savedData.product_link,
			owner_id: session.user.id
		};
		let result;
		if (isEdit) {
			const { error } = await supabase_lt
				.from('UserFilament')
				.update(payload)
				.eq('id', savedData.id);
			result = { error };
		} else {
			const { error } = await supabase_lt
				.from('UserFilament')
				.insert([payload]);
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
		const { error } = await supabase_lt
			.from('UserFilament')
			.delete()
			.eq('id', filamentToDelete.id);
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

</script>

<!-- Filament Management Section -->
<div class="mt-8">
	<div class="text-xl font-semibold text-white/60 mb-2 text-left pl-1 tracking-wide" style="backdrop-filter: blur(2px);">Filament inventory</div>
	<p class="text-sm text-red-400 pl-1">Disclaimer:</p>
	<p class="text-sm text-gray-500 pl-1">1. You will not be displayed on the marketplace if you have no filaments in your inventory</p>
	<p class="text-sm text-gray-500 pl-1">2. Only the colors you have in your inventory will be displayed on the marketplace</p>
	<p class="text-sm text-gray-500 pl-1 mb-2">3. Only the material types you have in your inventory will be displayed on the marketplace</p>
	<!-- Glassmorphism container -->
	<div class="overflow-x-auto bg-[#151515]/60 rounded-lg p-4 border border-gray-700/50">
		<table class="min-w-full divide-y divide-gray-700 text-left">
			<thead class="bg-[#0c0c0c]/50">
				<tr>
					<th scope="col" class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
					<th scope="col" class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Brand</th>
					<th scope="col" class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
					<th scope="col" class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Color</th>
					<th scope="col" class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity Left (kg)</th>
					<th scope="col" class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-700/50">
				{#if isLoadingFilaments}
					<tr>
						<!-- Adjusted colspan -->
						<td colspan="5" class="px-4 py-10 text-center text-sm text-gray-400">
							<div class="flex justify-center items-center space-x-2">
								<Icon icon="svg-spinners:ring-resize" class="h-5 w-5" />
								<span>Loading filaments...</span>
							</div>
						</td>
					</tr>
				{:else}
					{#each filamentInventory as filament (filament.temp_key)} <!-- Use the generated temp_key -->
						<tr class="hover:bg-[#1f1f1f]/50 transition-colors">
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{filament.name}</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{filament.brand || 'N/A'}</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{filament.material_type || 'N/A'}</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
								<div class="flex flex-wrap items-center gap-2">
									<span class="inline-block w-4 h-4 rounded-full border border-gray-500" style="background-color: {filament.color || '#ffffff'};"></span>
									<span class="text-xs">{filament.color || 'N/A'}</span>
								</div>
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{filament.quantity_kg ?? 'N/A'}</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
								<Button variant="ghost" size="icon" class="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all" onclick={() => openEditModal(filament)} aria-label="Edit filament">
									<Icon icon="ph:pencil-simple-line-bold" class="text-xl" />
								</Button>
								<Button variant="ghost" size="icon" class="ml-1 p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" onclick={() => askDeleteFilament(filament)} aria-label="Delete filament">
									<Icon icon="ph:trash-bold" class="text-xl" />
								</Button>
							</td>
						</tr>
					{:else}
						<!-- Enhanced Empty State Placeholder -->
						<tr>
							<td colspan="6" class="px-4 py-10 text-center text-sm text-gray-400">
								<div class="flex flex-col items-center space-y-3">
									<Icon icon="mdi:database-off-outline" class="h-10 w-10 text-gray-500" />
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
	<div class="mt-4 text-right">
			<button
				class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/20"
				onclick={openAddModal}
			>
				<Icon icon="ph:plus-bold" class="mr-1.5 h-4 w-4" /> Add Filament
			</button>
	</div>
</div>
<!-- End Filament Management Section -->

<!-- Modal Component -->
<FilamentFormModal
	bind:isOpen={isModalOpen}
	mode={modalMode}
	bind:filament={currentFilament}
	onSave={handleSaveFilament}
	onClose={closeModal}
/>

<ConfirmDialog
	bind:open={isDeleteDialogOpen}
	title="Delete Filament?"
	message="Are you sure you want to delete this filament? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	onConfirm={confirmDeleteFilament}
	onCancel={cancelDeleteFilament}
/>