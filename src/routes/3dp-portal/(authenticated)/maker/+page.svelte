<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Printer from '@lucide/svelte/icons/printer';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { SubmitFunction } from '@sveltejs/kit';
	import ApprovedMakerPortal from '$lib/components/maker/ApprovedMakerPortal.svelte';
	import { PortalCard, PortalSectionLabel, ParameterChip } from '$lib/components/portal';
	import { ScInput, Skeleton, TagBadge } from '$lib/components/sc';
	import { cn } from '$lib/utils';

	let { data } = $props();
	const makerStatus = data.makerStatus;
	const session = data.session;

	let name = $state($page.form?.name ?? '');
	let contactNumber = $state($page.form?.contactNumber ?? '');
	let email = $state($page.form?.email ?? session?.user?.email ?? '');
	let maxPrinterSize = $state($page.form?.maxPrinterSize ?? '');
	let numPrinters = $state($page.form?.numPrinters ?? 1);
	let selectedFilaments = $state<Set<string>>(new Set($page.form?.selectedFilaments ?? []));
	let submitting = $state(false);

	const availableFilaments = ['PLA', 'ABS', 'PETG', 'ASA', 'Nylon', 'PLA-CF', 'PETG-CF', 'ABS-CF'];

	function incrementPrinters() {
		numPrinters++;
	}

	function decrementPrinters() {
		if (numPrinters > 1) {
			numPrinters--;
		}
	}

	function toggleFilament(filament: string) {
		const newSet = new Set(selectedFilaments);
		if (newSet.has(filament)) {
			newSet.delete(filament);
		} else {
			newSet.add(filament);
		}
		selectedFilaments = newSet;
	}

	$effect(() => {
		name = $page.form?.name ?? name;
		contactNumber = $page.form?.contactNumber ?? contactNumber;
		email = $page.form?.email ?? email;
		maxPrinterSize = $page.form?.maxPrinterSize ?? maxPrinterSize;
		numPrinters = $page.form?.numPrinters ?? numPrinters;
		if ($page.form?.selectedFilaments) {
			selectedFilaments = new Set($page.form.selectedFilaments);
		}
	});

	const handleSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	};
</script>

<div class="mx-auto max-w-7xl px-4 pb-16">
	<header class="mb-8 border-b border-border pb-8">
		<TagBadge label="maker_portal" class="mb-3" />
		<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Maker Portal</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
			Manage your filament inventory, respond to print requests, and stay visible on the Fabbly
			marketplace.
		</p>
	</header>

	{#if makerStatus === 'approved'}
		<ApprovedMakerPortal
			supabase_lt={data.supabase_lt}
			{session}
			makerName={data.makerData?.name} />
	{:else if makerStatus === 'pending' || $page.form?.success}
		<PortalCard class="text-center">
			<div class="mx-auto max-w-md space-y-2">
				<p class="font-mono text-sm text-foreground">application_pending</p>
				<p class="text-sm text-muted-foreground">
					Your maker application is currently under review. We'll notify you once it's approved.
				</p>
			</div>
		</PortalCard>
	{:else}
		<div class="mx-auto max-w-2xl space-y-6">
			<div class="space-y-2 text-center">
				<h2 class="text-xl font-semibold tracking-tight text-foreground">Join the maker network</h2>
				<p class="text-sm text-muted-foreground">
					Register as a maker to start accepting print jobs from the community.
				</p>
			</div>

			{#if $page.form?.message}
				<div
					class={cn(
						'rounded-md border px-4 py-3 text-center text-sm',
						$page.form?.errors
							? 'border-destructive/30 bg-destructive/5 text-destructive'
							: 'border-border bg-muted/40 text-foreground'
					)}>
					{$page.form.message}
				</div>
			{/if}

			<PortalCard class="relative">
				{#if submitting}
					<div
						class="absolute inset-0 z-10 space-y-4 rounded-md bg-background/80 p-6 backdrop-blur-sm"
						aria-hidden="true">
						{#each Array(5) as _, i (i)}
							<Skeleton class="h-10 w-full rounded-md" />
						{/each}
					</div>
				{/if}

				<div class="mb-6 flex items-center gap-2">
					<Printer class="size-4 text-muted-foreground" strokeWidth={1.5} />
					<span class="font-mono text-sm text-foreground">maker_application</span>
				</div>

				<form method="POST" use:enhance={handleSubmit} class="space-y-5" novalidate>
					<div>
						<ScInput
							id="name"
							name="name"
							label="name"
							bind:value={name}
							required
							placeholder="Your full name"
							aria-invalid={$page.form?.errors?.name ? 'true' : undefined}
							aria-describedby={$page.form?.errors?.name ? 'name-error' : undefined} />
						{#if $page.form?.errors?.name}
							<p id="name-error" class="mt-1 text-xs text-destructive">{$page.form.errors.name}</p>
						{/if}
					</div>

					<div>
						<label for="contact" class="mb-1.5 block font-mono text-xs text-muted-foreground">
							phone — for contact purposes only in case of disputes
						</label>
						<div class="flex">
							<span
								class="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted/40 px-3 text-sm text-muted-foreground">
								+91
							</span>
							<ScInput
								id="contact"
								name="contactNumber"
								type="tel"
								bind:value={contactNumber}
								required
								pattern="[0-9]{10}"
								title="Please enter a valid 10-digit Indian mobile number"
								placeholder="9876543210"
								class="rounded-l-none"
								wrapperClass="flex-1"
								glow={false}
								aria-invalid={$page.form?.errors?.contactNumber ? 'true' : undefined}
								aria-describedby={$page.form?.errors?.contactNumber
									? 'contact-error'
									: undefined} />
						</div>
						{#if $page.form?.errors?.contactNumber}
							<p id="contact-error" class="mt-1 text-xs text-destructive">
								{$page.form.errors.contactNumber}
							</p>
						{/if}
					</div>

					<div>
						<ScInput
							id="email"
							name="email"
							type="email"
							label="email — for contact purposes only"
							bind:value={email}
							required
							placeholder="your.email@example.com"
							aria-invalid={$page.form?.errors?.email ? 'true' : undefined}
							aria-describedby={$page.form?.errors?.email ? 'email-error' : undefined} />
						{#if $page.form?.errors?.email}
							<p id="email-error" class="mt-1 text-xs text-destructive">
								{$page.form.errors.email}
							</p>
						{/if}
					</div>

					<div>
						<ScInput
							id="printerSize"
							name="maxPrinterSize"
							label="max_printer_build_area_mm"
							bind:value={maxPrinterSize}
							required
							pattern="\d+[xX]\d+"
							title="Format: WidthxDepth (e.g., 220x220)"
							placeholder="e.g., 220x220"
							aria-invalid={$page.form?.errors?.maxPrinterSize ? 'true' : undefined}
							aria-describedby={$page.form?.errors?.maxPrinterSize
								? 'printerSize-error'
								: undefined} />
						{#if $page.form?.errors?.maxPrinterSize}
							<p id="printerSize-error" class="mt-1 text-xs text-destructive">
								{$page.form.errors.maxPrinterSize}
							</p>
						{/if}
					</div>

					<div>
						<PortalSectionLabel label="number_of_printers" />
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
								onclick={decrementPrinters}
								disabled={numPrinters <= 1}
								aria-label="Decrease printer count">
								<Minus class="size-4" strokeWidth={1.5} />
							</button>
							<input
								type="number"
								id="numPrinters"
								name="numPrinters"
								bind:value={numPrinters}
								min="1"
								required
								class="h-10 w-20 rounded-md border border-border bg-card text-center text-sm text-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10"
								aria-invalid={$page.form?.errors?.numPrinters ? 'true' : undefined}
								aria-describedby={$page.form?.errors?.numPrinters
									? 'numPrinters-error'
									: undefined} />
							<button
								type="button"
								class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted"
								onclick={incrementPrinters}
								aria-label="Increase printer count">
								<Plus class="size-4" strokeWidth={1.5} />
							</button>
						</div>
						{#if $page.form?.errors?.numPrinters}
							<p id="numPrinters-error" class="mt-1 text-xs text-destructive">
								{$page.form.errors.numPrinters}
							</p>
						{/if}
					</div>

					<div>
						<PortalSectionLabel label="filament_types_supported" />
						<div class="flex flex-wrap gap-1.5">
							{#each availableFilaments as filament (filament)}
								{@const isSelected = selectedFilaments.has(filament)}
								{#if isSelected}
									<input type="hidden" name="selectedFilaments" value={filament} />
								{/if}
								<ParameterChip selected={isSelected} onclick={() => toggleFilament(filament)}>
									{filament}
								</ParameterChip>
							{/each}
						</div>
						{#if $page.form?.errors?.selectedFilaments}
							<p class="mt-1 text-xs text-destructive">{$page.form.errors.selectedFilaments}</p>
						{/if}
					</div>

					<button
						type="submit"
						class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
						disabled={submitting}>
						Submit application
					</button>
				</form>
			</PortalCard>
		</div>
	{/if}
</div>
