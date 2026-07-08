<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import { PortalSectionLabel, ParameterChip } from '$lib/components/portal';
	import { ChipGridSkeleton, ScButton, ScInput, Skeleton } from '$lib/components/sc';
	import { onMount } from 'svelte';
	import ColorPicker from './ColorPicker.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface FilamentData {
		id?: string | number;
		name: string;
		brand: string;
		type: string;
		color: string;
		quantity_kg: number;
		cost_kg: number;
		product_link: string;
		material_type: string;
		cost_approx: number;
	}

	let {
		isOpen = $bindable(false),
		mode = 'add' as 'add' | 'edit',
		filament = $bindable<Partial<FilamentData>>({}),
		onSave,
		onClose,
		supabase_lt
	}: {
		isOpen?: boolean;
		mode?: 'add' | 'edit';
		filament?: Partial<FilamentData>;
		onSave: (data: FilamentData) => void;
		onClose: () => void;
		supabase_lt: SupabaseClient;
	} = $props();

	let formData = $state<FilamentData>({
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
	let isMobile = $state(false);

	let filamentTypes: string[] = $state([]);
	let typesLoading = $state(true);
	let typesError: string | null = $state(null);

	let filamentPresets: Array<{
		id: string;
		name: string;
		brand: string;
		material_type: string;
		cost_approx: number;
		product_link: string;
	}> = $state([]);
	let presetLoading = $state(true);
	let presetError: string | null = $state(null);
	let showPresetDropdown = $state(false);
	let presetSearch = $state('');
	let showColorDialog = $state(false);

	const filteredPresets = $derived(
		filamentPresets.filter(
			(p) =>
				!presetSearch ||
				p.name?.toLowerCase().includes(presetSearch.toLowerCase()) ||
				p.brand?.toLowerCase().includes(presetSearch.toLowerCase()) ||
				p.material_type?.toLowerCase().includes(presetSearch.toLowerCase())
		)
	);

	const title = $derived(mode === 'add' ? 'Add filament' : 'Edit filament');

	onMount(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		const update = () => {
			isMobile = mq.matches;
		};
		update();
		mq.addEventListener('change', update);

		(async () => {
			typesLoading = true;
			try {
				const { data, error } = await supabase_lt
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
			} catch {
				typesError = 'Error loading filament types.';
				filamentTypes = [];
			} finally {
				typesLoading = false;
			}

			presetLoading = true;
			presetError = null;
			try {
				const { data, error } = await supabase_lt
					.from('Filament')
					.select('id, name, brand, material_type, cost_approx, product_link')
					.limit(100);
				if (error) {
					presetError = 'Failed to load filament presets.';
					filamentPresets = [];
				} else {
					filamentPresets = data || [];
				}
			} catch {
				presetError = 'Error loading filament presets.';
				filamentPresets = [];
			} finally {
				presetLoading = false;
			}
		})();

		return () => mq.removeEventListener('change', update);
	});

	$effect(() => {
		formData = {
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
		};
		errors = {};
		showPresetDropdown = false;
		presetSearch = '';
	});

	function selectType(type: string) {
		formData.type = type;
		errors.type = '';
	}

	function clearType() {
		formData.type = '';
	}

	function validate(): boolean {
		errors = {};
		if (!formData.name.trim()) errors.name = 'Name is required';
		if (!formData.brand.trim()) errors.brand = 'Brand is required';
		if (!formData.type.trim()) errors.type = 'Type is required';
		if (!formData.color.trim()) errors.color = 'Color is required';
		if (
			formData.quantity_kg === null ||
			formData.quantity_kg === undefined ||
			isNaN(formData.quantity_kg) ||
			formData.quantity_kg < 0
		) {
			errors.quantity_kg = 'Quantity must be a non-negative number';
		}
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;
		isSaving = true;
		try {
			onSave({
				id: filament?.id,
				...formData
			});
		} catch (error) {
			console.error('Error saving filament:', error);
			errors.general = 'Failed to save filament.';
		} finally {
			isSaving = false;
		}
	}

	function handleClose() {
		isOpen = false;
		onClose();
	}

	function handleOpenChange(open: boolean) {
		if (!open) handleClose();
	}

	function selectPreset(preset: (typeof filamentPresets)[number]) {
		formData = {
			id: undefined,
			name: preset.name || '',
			brand: preset.brand || '',
			type: preset.material_type || '',
			color: formData.color,
			quantity_kg: 1,
			cost_kg: preset.cost_approx || 999,
			product_link: preset.product_link || '',
			material_type: preset.material_type || '',
			cost_approx: preset.cost_approx || 999
		};
		showPresetDropdown = false;
	}

	let holdInterval: ReturnType<typeof setInterval> | null = null;
	let holdTimeout: ReturnType<typeof setTimeout> | null = null;

	function stepValue(field: 'quantity_kg' | 'cost_kg', delta: number) {
		if (field === 'quantity_kg') {
			formData.quantity_kg = Math.max(0, Math.round((formData.quantity_kg + delta) * 10) / 10);
		} else {
			formData.cost_kg = Math.max(0, Math.round((formData.cost_kg + delta) / 10) * 10);
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

{#snippet formBody()}
	<div class="relative pb-2">
		<ScButton
			variant="secondary"
			class="w-full justify-center sm:w-auto"
			onclick={() => (showPresetDropdown = !showPresetDropdown)}>
			{showPresetDropdown ? 'Hide presets' : 'Choose preset'}
		</ScButton>

		{#if showPresetDropdown}
			<div
				class="absolute inset-x-0 top-full z-50 mt-2 max-h-[50vh] overflow-auto rounded-md border border-border bg-card p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between gap-2">
					<PortalSectionLabel label="filament_presets" class="mb-0" />
					<button
						type="button"
						class="text-muted-foreground transition-colors hover:text-foreground"
						onclick={() => (showPresetDropdown = false)}
						aria-label="Close presets">
						<X class="size-4" strokeWidth={1.5} />
					</button>
				</div>
				<ScInput
					placeholder="Search preset…"
					bind:value={presetSearch}
					wrapperClass="mb-3"
					glow={false} />
				{#if presetLoading}
					<div class="flex flex-col gap-2 py-2" aria-hidden="true">
						{#each [...Array(4).keys()] as i (i)}
							<Skeleton class="h-12 w-full rounded-md" />
						{/each}
					</div>
				{:else if presetError}
					<p class="py-4 text-center text-sm text-destructive">{presetError}</p>
				{:else if filteredPresets.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">No matching presets found</p>
				{:else}
					<div class="flex flex-col gap-1">
						{#each filteredPresets as preset (preset.id)}
							<button
								type="button"
								class="rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/40"
								onclick={() => selectPreset(preset)}>
								<span class="font-medium text-foreground">{preset.brand} {preset.name}</span>
								<span class="mt-0.5 block font-mono text-xs text-muted-foreground">
									{preset.material_type}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<form id="filament-form" onsubmit={handleSubmit} class="grid gap-4">
		{#if errors.general}
			<p class="text-center text-sm text-destructive">{errors.general}</p>
		{/if}

		<div>
			<ScInput id="name" label="name" bind:value={formData.name} required />
			{#if errors.name}
				<p class="mt-1 text-xs text-destructive">{errors.name}</p>
			{/if}
		</div>

		<div>
			<ScInput id="brand" label="brand" bind:value={formData.brand} required />
			{#if errors.brand}
				<p class="mt-1 text-xs text-destructive">{errors.brand}</p>
			{/if}
		</div>

		<div>
			<PortalSectionLabel label="material_type" />
			{#if typesLoading}
				<div class="mt-2">
					<ChipGridSkeleton chips={5} />
				</div>
			{:else if typesError}
				<p class="mt-2 text-sm text-destructive">{typesError}</p>
			{:else if formData.type}
				<div class="mt-2 flex items-center gap-2">
					<ParameterChip selected={true}>{formData.type}</ParameterChip>
					<button
						type="button"
						class="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline"
						onclick={clearType}>
						change
					</button>
				</div>
			{:else}
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each filamentTypes as type (type)}
						<ParameterChip onclick={() => selectType(type)}>{type}</ParameterChip>
					{/each}
				</div>
			{/if}
			{#if errors.type}
				<p class="mt-1 text-xs text-destructive">{errors.type}</p>
			{/if}
		</div>

		<div>
			<PortalSectionLabel label="color" />
			<div class="mt-2 flex items-center gap-3">
				<span
					class="inline-block size-8 rounded-full border border-border"
					style="background-color: {formData.color}"></span>
				<ScButton variant="secondary" onclick={() => (showColorDialog = true)}>Pick color</ScButton>
			</div>
			{#if errors.color}
				<p class="mt-1 text-xs text-destructive">{errors.color}</p>
			{/if}
		</div>

		<div>
			<PortalSectionLabel label="quantity_kg" />
			<div class="mt-2 flex items-center gap-2">
				<button
					type="button"
					class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted"
					onmousedown={() => startHoldStep('quantity_kg', -0.1)}
					onmouseup={stopHoldStep}
					onmouseleave={stopHoldStep}
					aria-label="Decrease quantity">
					<Minus class="size-4" strokeWidth={1.5} />
				</button>
				<input
					id="quantity"
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.quantity_kg}
					required
					class="h-10 w-24 rounded-md border border-border bg-card text-center text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10" />
				<button
					type="button"
					class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted"
					onmousedown={() => startHoldStep('quantity_kg', 0.1)}
					onmouseup={stopHoldStep}
					onmouseleave={stopHoldStep}
					aria-label="Increase quantity">
					<Plus class="size-4" strokeWidth={1.5} />
				</button>
			</div>
			{#if errors.quantity_kg}
				<p class="mt-1 text-xs text-destructive">{errors.quantity_kg}</p>
			{/if}
		</div>

		<div>
			<PortalSectionLabel label="cost_per_kg_inr" />
			<div class="mt-2 flex items-center gap-2">
				<button
					type="button"
					class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted"
					onmousedown={() => startHoldStep('cost_kg', -10)}
					onmouseup={stopHoldStep}
					onmouseleave={stopHoldStep}
					aria-label="Decrease cost">
					<Minus class="size-4" strokeWidth={1.5} />
				</button>
				<input
					id="cost_kg"
					type="number"
					step="10"
					min="0"
					bind:value={formData.cost_kg}
					required
					placeholder="999"
					class="h-10 w-28 rounded-md border border-border bg-card text-center text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10" />
				<button
					type="button"
					class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted"
					onmousedown={() => startHoldStep('cost_kg', 10)}
					onmouseup={stopHoldStep}
					onmouseleave={stopHoldStep}
					aria-label="Increase cost">
					<Plus class="size-4" strokeWidth={1.5} />
				</button>
			</div>
		</div>

		<div>
			<ScInput
				id="product_link"
				type="url"
				label="product_link"
				bind:value={formData.product_link}
				placeholder="https://… (optional)" />
		</div>
	</form>
{/snippet}

{#snippet formFooter()}
	<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
		<ScButton variant="secondary" onclick={handleClose} disabled={isSaving}>Cancel</ScButton>
		<button
			type="submit"
			form="filament-form"
			class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
			disabled={isSaving}>
			{#if isSaving}
				Saving…
			{:else}
				Save changes
			{/if}
		</button>
	</div>
{/snippet}

{#if isMobile}
	<Drawer.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
		<Drawer.Content class="max-h-[92vh] border-border bg-background">
			<Drawer.Header class="border-b border-border pb-4 text-left">
				<Drawer.Title class="font-mono text-sm text-foreground">{title}</Drawer.Title>
			</Drawer.Header>
			<div class="overflow-y-auto px-4 py-4">
				{@render formBody()}
			</div>
			<Drawer.Footer class="border-t border-border">
				{@render formFooter()}
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
{:else}
	<Dialog.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
		<Dialog.Content
			class="max-h-[90vh] w-[95vw] overflow-hidden border-border bg-card p-0 sm:max-w-lg">
			<Dialog.Header class="border-b border-border px-6 py-4">
				<Dialog.Title class="font-mono text-sm text-foreground">{title}</Dialog.Title>
			</Dialog.Header>
			<div class="max-h-[calc(90vh-8rem)] overflow-y-auto px-6 py-4">
				{@render formBody()}
			</div>
			<Dialog.Footer class="border-t border-border px-6 py-4">
				{@render formFooter()}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if showColorDialog}
	<ColorPicker
		bind:isOpen={showColorDialog}
		value={formData.color}
		on:change={(e) => {
			formData.color = e.detail.hex;
			showColorDialog = false;
		}}
		on:cancel={() => {
			showColorDialog = false;
		}} />
{/if}
