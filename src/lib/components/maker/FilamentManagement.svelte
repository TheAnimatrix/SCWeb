<script lang="ts">
	import { F } from '$lib/icons/fluent';

	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import type { TypedSupabaseClient } from '$lib/types/database';
	import type { Filament, FilamentFormData } from '$lib/types/filament';
	import { onMount } from 'svelte';
	import FilamentFormModal from './FilamentFormModal.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { ScButton, TableBodySkeleton } from '$lib/components/sc';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Define the expected structure for a filament object
	// Props expected from the parent component
	let {
		supabase,
		session,
		onUpdate
	}: {
		supabase: TypedSupabaseClient;
		session: { data: { user: { id: string } } } | null;
		onUpdate: () => void;
	} = $props();

	// State for filament inventory
	let filamentInventory = $state<Filament[]>([]);
	let isLoadingFilaments = $state(false);
	let filamentError = $state<string | null>(null);
	// Errors from deleting; shown above the table so they are visible when it has rows.
	let actionError = $state<string | null>(null);

	// Modal State
	let isModalOpen = $state(false);
	let modalMode = $state<'add' | 'edit'>('add');
	let currentFilament = $state<Partial<FilamentFormData>>({});

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
				const { data, error } = await supabase
					.from('UserFilament')
					.select('*')
					.eq('owner_id', session?.data?.user?.id)
					.order('created_at', { ascending: false });

				if (error) {
					console.error('Error fetching filament data:', error);
					filamentError = "Couldn't load your filaments. Refresh to try again.";
				} else if (Array.isArray(data)) {
					filamentInventory = data.map((item, index) => ({
						...item,
						temp_key: item.id || `filament-${index}-${Math.random()}`
					}));
				} else {
					filamentInventory = [];
				}
			} catch (e: unknown) {
				console.error('Exception fetching filament data:', e);
				filamentError = "Couldn't load your filaments. Refresh to try again.";
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
		currentFilament = { ...filamentToEdit } as Partial<FilamentFormData>;
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		// Optionally reset currentFilament after a delay if needed
		// setTimeout(() => { currentFilament = {}; }, 300);
	}

	/** Saves the filament; returns an error message for the form, or null on success. */
	async function handleSaveFilament(savedData: FilamentFormData): Promise<string | null> {
		if (!session?.data?.user?.id) return 'Your session has expired. Refresh the page.';
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
			const { error } = await supabase
				.from('UserFilament')
				.update(payload)
				.eq('id', String(savedData.id));
			result = { error };
		} else {
			const { error } = await supabase.from('UserFilament').insert([payload]);
			result = { error };
		}
		if (result.error) {
			return `Couldn't save this filament. ${result.error.message}`;
		}
		await fetchFilamentData();
		closeModal();
		return null;
	}

	// Update handleDeleteFilament to delete from UserFilament
	async function handleDeleteFilament(filamentToDelete: Filament) {
		if (!filamentToDelete.id) return;
		actionError = null;
		const { error } = await supabase.from('UserFilament').delete().eq('id', filamentToDelete.id);
		if (!error) {
			await fetchFilamentData();
		} else {
			actionError = `Couldn't delete this filament. ${error.message}`;
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

{#snippet rowActions(filament: Filament)}
	<Button
		variant="ghost"
		size="icon"
		class="size-10 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
		onclick={() => openEditModal(filament)}
		aria-label="Edit {filament.name ?? 'filament'}">
		<Icon icon={F.edit} class="text-lg" aria-hidden="true" />
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="ml-1 size-10 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
		onclick={() => askDeleteFilament(filament)}
		aria-label="Delete {filament.name ?? 'filament'}">
		<Icon icon={F.delete} class="text-lg" aria-hidden="true" />
	</Button>
{/snippet}

{#snippet emptyState()}
	<div
		class="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted-foreground">
		<Icon icon={F.database} class="size-10 text-muted-foreground" aria-hidden="true" />
		{#if filamentError}
			<span class="text-destructive" role="alert">{filamentError}</span>
		{:else}
			<span>No filaments yet. Add the spools you can print with.</span>
		{/if}
	</div>
{/snippet}

<!-- Filament Management Section -->
<PortalCard>
	<PortalSectionLabel label="Filaments" class="mb-4" />

	<div class="mb-4 rounded-md border border-border bg-muted/20 p-4">
		<button
			type="button"
			class="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
			aria-expanded={disclaimerVisible}
			onclick={() => (disclaimerVisible = !disclaimerVisible)}>
			<Icon
				icon={disclaimerVisible ? F.chevronDown : F.chevronRight}
				class="text-xs text-muted-foreground"
				aria-hidden="true" />
			<span>How customers see your filaments</span>
		</button>

		{#if disclaimerVisible}
			<div
				class="mt-3 flex flex-col gap-y-2"
				in:slide={{ duration: 200, easing: cubicOut }}
				out:slide={{ duration: 200, easing: cubicOut }}>
				{#each ["Customers can't find you until you have at least one filament with stock.", 'Customers only see the colours you have in stock.', 'Customers only see the materials you have in stock.', 'Keep your stock up to date so customers only ask for what you can print.'] as item, index (index)}
					<p class="flex items-start gap-2 text-sm text-muted-foreground">
						<span
							class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-xs text-foreground">
							{index + 1}
						</span>
						<span>{item}</span>
					</p>
				{/each}
				<button
					type="button"
					class="mt-2 self-end rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onclick={hideDisclaimerPermanently}>
					Don't show again
				</button>
			</div>
		{/if}
	</div>

	{#if actionError}
		<p class="mb-3 text-sm text-destructive" role="alert">{actionError}</p>
	{/if}

	<!-- Phones: stacked cards so the actions stay on screen. -->
	<div class="sm:hidden">
		{#if isLoadingFilaments}
			<div class="space-y-2" aria-hidden="true">
				<div class="h-20 animate-pulse rounded-md bg-muted/40"></div>
				<div class="h-20 animate-pulse rounded-md bg-muted/40"></div>
			</div>
		{:else if filamentInventory.length === 0}
			<div class="rounded-md border border-border">{@render emptyState()}</div>
		{:else}
			<ul class="space-y-2">
				{#each filamentInventory as filament (filament.temp_key)}
					<li class="flex items-start justify-between gap-3 rounded-md border border-border p-3">
						<div class="min-w-0 text-sm">
							<p class="font-medium text-foreground">{filament.name}</p>
							<p class="text-muted-foreground">
								{[filament.brand, filament.material_type].filter(Boolean).join(' · ')}
							</p>
							<p class="mt-1 flex items-center gap-2 text-muted-foreground">
								<span
									class="inline-block size-4 rounded-full border border-border"
									style="background-color: {filament.color || '#ffffff'};"
									aria-hidden="true"></span>
								<span class="font-mono text-xs">{filament.color || 'No colour'}</span>
								<span>· {filament.quantity_kg ?? 0} kg left</span>
							</p>
						</div>
						<div class="flex shrink-0">{@render rowActions(filament)}</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="hidden overflow-x-auto rounded-md border border-border sm:block">
		<table class="min-w-full divide-y divide-border text-left">
			<thead class="bg-muted/30">
				<tr>
					<th scope="col" class="px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
					<th scope="col" class="px-4 py-3 text-sm font-medium text-muted-foreground">Brand</th>
					<th scope="col" class="px-4 py-3 text-sm font-medium text-muted-foreground">Material</th>
					<th scope="col" class="px-4 py-3 text-sm font-medium text-muted-foreground">Colour</th>
					<th scope="col" class="px-4 py-3 text-sm font-medium text-muted-foreground">
						Spool left (kg)
					</th>
					<th scope="col" class="px-4 py-3 text-sm font-medium text-muted-foreground">
						<span class="sr-only">Actions</span>
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
								>{filament.brand || '—'}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
								>{filament.material_type || '—'}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="inline-block size-4 rounded-full border border-border"
										style="background-color: {filament.color || '#ffffff'};"
										aria-hidden="true"></span>
									<span class="font-mono text-xs text-muted-foreground"
										>{filament.color || '—'}</span>
								</div>
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
								>{filament.quantity_kg ?? '—'}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">
								{@render rowActions(filament)}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6">{@render emptyState()}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<div class="mt-4 flex justify-end">
		<ScButton variant="secondary" onclick={openAddModal}>
			<Icon icon={F.add} class="mr-1.5 size-4" />
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
	{supabase} />

<ConfirmDialog
	bind:open={isDeleteDialogOpen}
	title="Delete this filament?"
	message="Customers will no longer see it. You can't undo this."
	confirmText="Delete filament"
	cancelText="Keep filament"
	onConfirm={confirmDeleteFilament}
	onCancel={cancelDeleteFilament} />
