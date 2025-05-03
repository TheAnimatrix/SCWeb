<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	// Import Dialog using the correct alias path
	import * as Dialog from "$lib/components/ui/dialog";
	import Icon from '@iconify/svelte';
	import { supabrowserclient } from '$lib/supabaseclient';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import ColorPicker from './ColorPicker.svelte';

	// Define the structure for a filament object (can be imported from a types file later)
	interface FilamentData {
		id?: string | number;
		name: string;
		brand: string;
		type: string;
		color: string; // Consider using a color picker input later
		quantity_kg: number;
		cost_kg: number;
		product_link: string;
		material_type: string;
		cost_approx: number;
	}

	// Props & Events combined into one $props() call
	let {
		isOpen = $bindable(false), // Controls modal visibility
		mode = 'add' as 'add' | 'edit', // 'add' or 'edit'
		filament = $bindable<Partial<FilamentData>>({}), // Data for editing or initial values
		onSave,
		onClose
	}: {
		isOpen?: boolean,
		mode?: 'add' | 'edit',
		filament?: Partial<FilamentData>,
		// Event handlers passed as props
		onSave: (data: FilamentData) => void,
		onClose: () => void
	} = $props();

	// Use a Svelte store for formData to allow reactive binding
	const formData = writable<FilamentData>({
		id: filament?.id,
		name: filament?.name ?? '',
		brand: filament?.brand ?? '',
		type: filament?.type ?? '',
		color: filament?.color ?? '#ffffff',
		quantity_kg: filament?.quantity_kg ?? 1,
		cost_kg: filament?.cost_kg ?? 999,
		product_link: filament?.product_link ?? '',
		material_type: filament?.material_type ?? '',
		cost_approx: filament?.cost_approx ?? 999
	});
	let errors: Record<string, string> = $state({});
	let isSaving = $state(false);

	let filamentTypes: string[] = $state([]);
	let typesLoading = $state(true);
	let typesError: string | null = $state(null);

	// Filament preset state
	let filamentPresets: Array<{id:string, name:string, brand:string, material_type:string, cost_approx:number, product_link:string}> = $state([]);
	let presetLoading = $state(true);
	let presetError: string | null = $state(null);
	let showPresetDropdown = $state(false);
	let presetSearch = $state('');

	let showColorDialog = $state(false);

	onMount(async () => {
		// Fetch filament types from constants table
		typesLoading = true;
		try {
			const { data, error } = await supabrowserclient
				.from('constants')
				.select('value')
				.eq('key', 'FILTYPES')
				.single();
			if (error) {
				typesError = 'Failed to load filament types.';
				filamentTypes = [];
			} else {
				filamentTypes = data?.value || [];
			}
		} catch (e) {
			typesError = 'Error loading filament types.';
			filamentTypes = [];
		} finally {
			typesLoading = false;
		}

		// Fetch filament presets as before
		presetLoading = true;
		presetError = null;
		try {
			const { data, error } = await supabrowserclient
				.from('Filament')
				.select('id, name, brand, material_type, cost_approx, product_link')
				.limit(100);
			if (error) {
				presetError = 'Failed to load filament presets.';
				filamentPresets = [];
			} else {
				filamentPresets = data || [];
			}
		} catch (e) {
			presetError = 'Error loading filament presets.';
			filamentPresets = [];
		} finally {
			presetLoading = false;
		}
	});

	function selectType(type: string) {
		formData.update(fd => ({ ...fd, type }));
		errors.type = '';
	}

	function clearType() {
		formData.update(fd => ({ ...fd, type: '' }));
	}

	// Update local state when filament prop changes (e.g., opening for edit)
	$effect(() => {
		formData.set({
			id: filament?.id,
			name: filament?.name ?? '',
			brand: filament?.brand ?? '',
			type: filament?.type ?? filament?.material_type ?? '',
			color: filament?.color ?? '#ffffff',
			quantity_kg: filament?.quantity_kg ?? 1,
			cost_kg: filament?.cost_kg ?? filament?.cost_approx ?? 999,
			product_link: filament?.product_link ?? '',
			material_type: filament?.material_type ?? '',
			cost_approx: filament?.cost_approx ?? 999
		});
		errors = {};
	});

	function validate(): boolean {
		errors = {};
		let fd: FilamentData | undefined;
		formData.subscribe(v => fd = v)();
		if (!fd) return false;
		if (!fd.name.trim()) errors.name = 'Name is required';
		if (!fd.brand.trim()) errors.brand = 'Brand is required';
		if (!fd.type.trim()) errors.type = 'Type is required';
		if (!fd.color.trim()) errors.color = 'Color is required';
		if (fd.quantity_kg === null || fd.quantity_kg === undefined || isNaN(fd.quantity_kg) || fd.quantity_kg < 0) {
			errors.quantity_kg = 'Quantity must be a non-negative number';
		}
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;
		isSaving = true;
		let fd: FilamentData | undefined;
		formData.subscribe(v => fd = v)();
		if (!fd) return;
		try {
			onSave({
				id: filament?.id,
				...fd
			});
		} catch (error) {
			console.error("Error saving filament:", error);
			errors.general = "Failed to save filament.";
		} finally {
			isSaving = false;
		}
	}

	function handleClose() {
		isOpen = false; // Update bindable prop
		onClose(); // Call parent close handler
	}

	function selectPreset(preset: {id:string, name:string, brand:string, material_type:string, cost_approx:number, product_link:string}) {
		let currentColor: string = '#ffffff';
		formData.subscribe(fd => { if (fd && fd.color) currentColor = fd.color; })();
		formData.set({
			id: undefined,
			name: preset.name || '',
			brand: preset.brand || '',
			type: preset.material_type || '',
			color: currentColor,
			quantity_kg: 1,
			cost_kg: preset.cost_approx || 999,
			product_link: preset.product_link || '',
			material_type: preset.material_type || '',
			cost_approx: preset.cost_approx || 999
		});
		showPresetDropdown = false;
	}

	// Quantity and cost stepper logic (no $state mutation in template)
	let holdInterval: NodeJS.Timeout | null = null;
	let holdTimeout: NodeJS.Timeout | null = null;

	function stepValue(field: 'quantity_kg' | 'cost_kg', delta: number) {
		if (field === 'quantity_kg') {
			formData.update(fd => ({ ...fd, quantity_kg: Math.max(0, Math.round((fd.quantity_kg + delta) * 10) / 10) }));
		} else if (field === 'cost_kg') {
			formData.update(fd => ({ ...fd, cost_kg: Math.max(0, Math.round((fd.cost_kg + delta) / 10) * 10) }));
		}
	}

	function startHoldStep(field: 'quantity_kg' | 'cost_kg', delta: number) {
		stepValue(field, delta);
		holdTimeout = setTimeout(() => {
			holdInterval = setInterval(() => stepValue(field, delta), 60);
		}, 400);
	}

	function stopHoldStep() {
		if (holdTimeout) clearTimeout(holdTimeout);
		if (holdInterval) clearInterval(holdInterval);
	}

</script>

<Dialog.Root bind:open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
	<Dialog.Content class="xs:max-h-[80vh] overflow-y-auto sm:max-w-[425px] w-[95vw] md:w-full bg-[#101010]/80 border border-[#23232a]/80 rounded-2xl shadow-glow-subtle backdrop-blur-lg text-white p-0">
		<Dialog.Header class="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
			<Dialog.Title class="text-lg font-semibold text-accent mb-1">{mode === 'add' ? 'Add New Filament' : 'Edit Filament'}</Dialog.Title>
		</Dialog.Header>
		<!-- Library Preset Action Button & Dropdown Container -->
		<div class="px-4 sm:px-6 pb-2">
			<div class="relative flex items-center gap-2">
				<Button type="button" class="flex items-center gap-2 bg-accent/20 text-accent font-semibold px-3 py-1 rounded-full hover:bg-accent/40 transition-colors" onclick={() => showPresetDropdown = !showPresetDropdown}>
					<Icon icon="ph:books" class="text-lg" />
					<span>{showPresetDropdown ? 'Hide Presets' : 'Choose Preset'}</span>
				</Button>
				{#if showPresetDropdown}
				<!-- Position dropdown absolutely relative to the button container above -->
				<div class="absolute left-0 right-0 top-full mt-2 z-50">
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="max-w-md bg-[#18181b]/90 border border-accent/30 rounded-xl shadow-lg backdrop-blur-md p-4 max-h-[60vh] overflow-auto" onclick={(e) => e.stopPropagation()}>
						<div class="flex items-center justify-between mb-2">
							<div class="text-sm font-semibold text-accent">Select Filament Preset</div>
							<button type="button" class="text-gray-400 hover:text-accent" onclick={() => showPresetDropdown = false}>
								<Icon icon="mdi:close" class="text-lg" />
							</button>
						</div>
						<input type="text" placeholder="Search preset..." bind:value={presetSearch} class="w-full mb-3 px-3 py-2 rounded bg-[#101010]/80 border border-gray-700 text-sm text-white focus:ring-accent focus:border-accent" />
						{#if presetLoading}
							<div class="text-sm text-gray-500 py-4 text-center">Loading presets...</div>
						{:else if presetError}
							<div class="text-sm text-red-500 py-4 text-center">{presetError}</div>
						{:else if filamentPresets.filter(p => !presetSearch || p.name?.toLowerCase().includes(presetSearch.toLowerCase()) || p.brand?.toLowerCase().includes(presetSearch.toLowerCase()) || p.material_type?.toLowerCase().includes(presetSearch.toLowerCase())).length === 0}
							<div class="text-sm text-gray-500 py-4 text-center">No matching presets found</div>
						{:else}
							<div class="flex flex-col gap-2">
								{#each filamentPresets.filter(p => !presetSearch || p.name?.toLowerCase().includes(presetSearch.toLowerCase()) || p.brand?.toLowerCase().includes(presetSearch.toLowerCase()) || p.material_type?.toLowerCase().includes(presetSearch.toLowerCase())) as preset}
									<button type="button" class="w-full text-left px-3 py-2 rounded hover:bg-accent/20 transition-colors flex flex-col gap-0.5" onclick={() => selectPreset(preset)}>
										<span class="font-semibold text-accent">{preset.brand} {preset.name}</span>
										<span class="text-xs text-gray-400">{preset.material_type}</span>
										{#if preset.product_link}
											<a href={preset.product_link} target="_blank" class="text-xs text-blue-400 underline w-fit">Product Link</a>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				{/if}
			</div>
		</div>
		<form onsubmit={handleSubmit} class="grid gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
            {#if errors.general}
                <p class="text-red-500 text-sm text-center">{errors.general}</p>
            {/if}
			<!-- Name -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="name" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Name</label>
				<input id="name" bind:value={$formData.name} required class="sm:col-span-3 h-9 px-3 bg-[#0c0c0c]/80 border border-gray-700 rounded-md focus:ring-accent focus:border-accent text-sm" />
				{#if errors.name}<p class="col-span-full text-right text-red-500 text-xs">{errors.name}</p>{/if}
			</div>
			<!-- Brand -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="brand" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Brand</label>
				<input id="brand" bind:value={$formData.brand} required class="sm:col-span-3 h-9 px-3 bg-[#0c0c0c]/80 border border-gray-700 rounded-md focus:ring-accent focus:border-accent text-sm" />
                {#if errors.brand}<p class="col-span-full text-right text-red-500 text-xs">{errors.brand}</p>{/if}
			</div>
			<!-- Type -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="type" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Type</label>
				<div class="sm:col-span-3 flex flex-col gap-1">
					{#if typesLoading}
						<div class="text-xs text-gray-500">Loading types...</div>
					{:else if typesError}
						<div class="text-xs text-red-500">{typesError}</div>
					{:else}
						{#if $formData.type}
							<!-- Show breadcrumb for selected type -->
							<div class="flex items-center gap-2">
								<span class="bg-accent/20 text-accent px-2 py-1 rounded-full text-xs font-semibold">{$formData.type}</span>
								<button type="button" class="ml-1 text-xs text-gray-400 hover:text-accent underline" onclick={clearType}>
									Change
								</button>
							</div>
						{:else}
							<!-- Show all types as breadcrumbs -->
							<div class="flex flex-wrap gap-2">
								{#each filamentTypes as type}
									<button type="button" class="bg-[#18181b]/80 border border-accent/30 text-accent px-2 py-1 rounded-full text-xs font-medium hover:bg-accent hover:text-black transition-colors" onclick={() => selectType(type)}>{type}</button>
								{/each}
							</div>
						{/if}
					{/if}
					{#if errors.type}<p class="text-right text-red-500 text-xs mt-1">{errors.type}</p>{/if}
				</div>
			</div>
			<!-- Color -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="color" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Color</label>
				<div class="sm:col-span-3 flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<span class="inline-block w-8 h-8 rounded-full border border-gray-600" style="background-color: {$formData.color}"></span>
						<Button type="button" class="px-3 py-1 rounded bg-accent/20 text-accent font-semibold hover:bg-accent/40 transition-colors" onclick={() => showColorDialog = true}>
							Pick Color
						</Button>
					</div>
				</div>
				{#if errors.color}<p class="col-span-full text-right text-red-500 text-xs">{errors.color}</p>{/if}
			</div>
			{#if showColorDialog}
				<!-- Directly render ColorPicker and bind its isOpen prop -->
				<ColorPicker
					bind:isOpen={showColorDialog}
					value={$formData.color}
					on:change={e => {
						formData.update(fd => ({ ...fd, color: e.detail.hex }));
						showColorDialog = false; // Close on change
					}}
					on:cancel={() => {
						showColorDialog = false; // Close on cancel
					}}
				/>
			{/if}
			<!-- Quantity with steppers -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="quantity" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Quantity (kg)</label>
				<div class="sm:col-span-3 flex items-center gap-2">
					<Button type="button" variant="outline" size="icon" class="border-gray-700 h-9 w-9 flex-shrink-0" onmousedown={() => startHoldStep('quantity_kg', -0.1)} onmouseup={stopHoldStep} onmouseleave={stopHoldStep}>-</Button>
					<input id="quantity" type="number" step="0.1" min="0" bind:value={$formData.quantity_kg} required class="w-full sm:w-20 text-center h-9 px-3 bg-[#0c0c0c]/80 border border-gray-700 rounded-md focus:ring-accent focus:border-accent text-sm appearance-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none" />
					<Button type="button" variant="outline" size="icon" class="border-gray-700 h-9 w-9 flex-shrink-0" onmousedown={() => startHoldStep('quantity_kg', 0.1)} onmouseup={stopHoldStep} onmouseleave={stopHoldStep}>+</Button>
				</div>
			</div>
			<!-- Cost per KG with steppers and rupee symbol -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="cost_kg" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Cost per KG ₹</label>
				<div class="sm:col-span-3 flex items-center gap-2">
					<Button type="button" variant="outline" size="icon" class="border-gray-700 h-9 w-9 flex-shrink-0" onmousedown={() => startHoldStep('cost_kg', -10)} onmouseup={stopHoldStep} onmouseleave={stopHoldStep}>-</Button>
					<input id="cost_kg" type="number" step="10" min="0" bind:value={$formData.cost_kg} required class="w-full sm:w-24 text-center h-9 px-3 bg-[#0c0c0c]/80 border border-gray-700 rounded-md focus:ring-accent focus:border-accent text-sm" placeholder="999" />
					<Button type="button" variant="outline" size="icon" class="border-gray-700 h-9 w-9 flex-shrink-0" onmousedown={() => startHoldStep('cost_kg', 10)} onmouseup={stopHoldStep} onmouseleave={stopHoldStep}>+</Button>
				</div>
			</div>
			<!-- Product Link -->
			<div class="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
				<label for="product_link" class="text-left sm:text-right text-xs text-accent sm:text-gray-400">Product Link</label>
				<input id="product_link" type="url" bind:value={$formData.product_link} class="sm:col-span-3 h-9 px-3 bg-[#0c0c0c]/80 border border-gray-700 rounded-md focus:ring-accent focus:border-accent text-sm" placeholder="https://... (optional)" />
			</div>
		</form>
		<Dialog.Footer class="flex gap-2 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 justify-end bg-transparent">
            <Button variant="outline" onclick={handleClose} disabled={isSaving}>Cancel</Button>
			<Button type="submit" onclick={handleSubmit} disabled={isSaving} class="bg-accent hover:bg-accent/90 text-black">
                {#if isSaving}
                    <Icon icon="line-md:loading-twotone-loop" class="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                {:else}
				    Save changes
                {/if}
            </Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
/* Only keep any essential global styles that can't be handled with Tailwind */
@media (max-width: 640px) {
  :global(.swatch-grid) {
    grid-template-columns: repeat(5, 1fr) !important;
    gap: 0.5rem !important;
  }
  
  :global(.swatch) {
    width: 2.5rem !important;
    height: 2.5rem !important;
  }
}
</style>