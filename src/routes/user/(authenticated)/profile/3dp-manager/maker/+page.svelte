<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onMount } from 'svelte'; // Import onMount if not already present (or use $effect)
	import ApprovedMakerPortal from '$lib/components/maker/ApprovedMakerPortal.svelte'; // Import the new component


	// Access data passed from the parent layout (+layout.server.ts)
	let { data } = $props();
	const makerStatus = data.makerStatus; // 'approved', 'pending', or 'not_maker'
	const session = data.session; // Get session for user ID and email

	// Form state for 'not_maker' - used for UI interaction and initial values
	let name = $state($page.form?.name ?? '');
	let contactNumber = $state($page.form?.contactNumber ?? '');
	let email = $state($page.form?.email ?? session?.user?.email ?? ''); // Pre-fill email if available, prioritize form data on error
	let maxPrinterSize = $state($page.form?.maxPrinterSize ?? '');
	let numPrinters = $state($page.form?.numPrinters ?? 1);
	// Initialize the Set from form data if available (on validation error), otherwise empty
	let selectedFilaments = $state<Set<string>>(new Set($page.form?.selectedFilaments ?? []));
	let submitting = $state(false); // State for loading indicator


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

	// Client-side validation removed, handled by server action
	// submitForm function removed, handled by enhance

	// Reactive statement to update state if form data changes (e.g., after server validation error)
	$effect(() => {
		name = $page.form?.name ?? name;
		contactNumber = $page.form?.contactNumber ?? contactNumber;
		email = $page.form?.email ?? email;
		maxPrinterSize = $page.form?.maxPrinterSize ?? maxPrinterSize;
		numPrinters = $page.form?.numPrinters ?? numPrinters;
		// Re-initialize Set if form data for filaments exists
		if ($page.form?.selectedFilaments) {
			selectedFilaments = new Set($page.form.selectedFilaments);
		}
	});

	// Enhance callback to handle loading state
	const handleSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ result, update }) => {
			// Reset specific fields or perform actions based on result type if needed
			// For example, clear form on success:
			// if (result.type === 'success') {
			//   name = '';
			//   contactNumber = '';
			//   // ... reset other fields
			//   selectedFilaments = new Set();
			// }
			await update(); // Update $page.form store
			submitting = false;
		};
	};
</script>

{#if makerStatus === 'approved'}
	<!-- Render the ApprovedMakerPortal component, passing Supabase client, session, and maker name -->
	<ApprovedMakerPortal supabase_lt={data.supabase_lt} {session} makerName={data.makerData?.name} />
{:else if makerStatus === 'pending' || $page.form?.success}
	<!-- Show pending message if status is pending OR if form submission was successful -->
	<div class="text-center p-6 bg-[#151515]/40 border-yellow-400/40 border-1 rounded-lg">
		<p class="text-lg font-semibold text-yellow-400">Application Pending</p>
		<p class="text-gray-400 mt-2">Your maker application is currently under review.</p>
	</div>
{:else}
	<!-- Not a Maker and form not successfully submitted - Show Registration Form -->
	<h2 class="text-2xl font-semibold mb-4 text-center text-accent">
		Join the Peer-to-Peer Print Revolution!
	</h2>
	<p class="text-gray-400 text-center mb-8">Register as a maker to start accepting print jobs.</p>

	<!-- General error message from server -->
	{#if $page.form?.message}
		<div class="mb-4 p-3 rounded-md text-center" class:bg-red-500={$page.form?.errors} class:bg-yellow-500={!$page.form?.errors}>
			<p class="text-sm text-white">{$page.form.message}</p>
		</div>
	{/if}

	<!-- Add relative positioning to the form container for the absolute overlay -->
	<div class="relative p-6 rounded-lg bg-[#151515]/40 border-1 border-accent/20">
		{#if submitting}
			<!-- Loading Overlay -->
			<div
				class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm border-accent/20 border-1"
			>
				<Icon icon="line-md:loading-twotone-loop" class="h-12 w-12 text-accent" />
			</div>
		{/if}

		<form method="POST" use:enhance={handleSubmit} class="space-y-6" novalidate>
			<!-- Name -->
			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-1">Name</label>
			<input
				type="text"
				id="name"
				name="name"
				bind:value={name}
				required
				class="w-full px-4 py-2 bg-[#0c0c0c] border border-gray-600 rounded-md focus:ring-accent focus:border-accent text-white placeholder-gray-500"
				placeholder="Your full name"
				aria-invalid={$page.form?.errors?.name ? 'true' : undefined}
				aria-describedby={$page.form?.errors?.name ? 'name-error' : undefined}
			/>
			{#if $page.form?.errors?.name}
				<p id="name-error" class="text-red-500 text-xs mt-1">{$page.form.errors.name}</p>
			{/if}
		</div>

		<!-- Contact Number -->
		<div>
			<label for="contact" class="block text-sm font-medium text-gray-300 mb-1">Phone Number - for contact purposes only in case of disputes</label>
			<div class="flex items-center">
				<span
					class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-600 bg-[#0c0c0c] text-gray-400 rounded-l-md"
					>+91</span
				>
				<input
					type="tel"
					id="contact"
					name="contactNumber"
					bind:value={contactNumber}
					required
					pattern="[0-9]{10}"
					title="Please enter a valid 10-digit Indian mobile number"
					class="w-full px-4 py-2 bg-[#0c0c0c] border border-gray-600 rounded-r-md focus:ring-accent focus:border-accent text-white placeholder-gray-500"
					placeholder="9876543210"
					aria-invalid={$page.form?.errors?.contactNumber ? 'true' : undefined}
					aria-describedby={$page.form?.errors?.contactNumber ? 'contact-error' : undefined}
				/>
			</div>
			{#if $page.form?.errors?.contactNumber}
				<p id="contact-error" class="text-red-500 text-xs mt-1">{$page.form.errors.contactNumber}</p>
			{/if}
		</div>

		<!-- Email -->
		<div>
			<label for="email" class="block text-sm font-medium text-gray-300 mb-1">Email - for contact purposes only</label>
			<input
				type="email"
				id="email"
				name="email"
				bind:value={email}
				required
				class="w-full px-4 py-2 bg-[#0c0c0c] border border-gray-600 rounded-md focus:ring-accent focus:border-accent text-white placeholder-gray-500"
				placeholder="your.email@example.com"
				aria-invalid={$page.form?.errors?.email ? 'true' : undefined}
				aria-describedby={$page.form?.errors?.email ? 'email-error' : undefined}
			/>
			{#if $page.form?.errors?.email}
				<p id="email-error" class="text-red-500 text-xs mt-1">{$page.form.errors.email}</p>
			{/if}
		</div>

		<!-- Max Printer Size -->
		<div>
			<label for="printerSize" class="block text-sm font-medium text-gray-300 mb-1"
				>Max Printer Build Area (mm)</label
			>
			<input
				type="text"
				id="printerSize"
				name="maxPrinterSize"
				bind:value={maxPrinterSize}
				required
				pattern="\d+[xX]\d+"
				title="Format: WidthxDepth (e.g., 220x220)"
				class="w-full px-4 py-2 bg-[#0c0c0c] border border-gray-600 rounded-md focus:ring-accent focus:border-accent text-white placeholder-gray-500"
				placeholder="e.g., 220x220"
				aria-invalid={$page.form?.errors?.maxPrinterSize ? 'true' : undefined}
				aria-describedby={$page.form?.errors?.maxPrinterSize ? 'printerSize-error' : undefined}
			/>
			{#if $page.form?.errors?.maxPrinterSize}
				<p id="printerSize-error" class="text-red-500 text-xs mt-1">{$page.form.errors.maxPrinterSize}</p>
			{/if}
		</div>

		<!-- Number of Printers -->
		<div>
			<label for="numPrinters" class="block text-sm font-medium text-gray-300 mb-1"
				>Number of Printers</label
			>
			<div class="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="icon"
					class="border-gray-600 hover:bg-gray-700"
					onclick={decrementPrinters}
					disabled={numPrinters <= 1}
				>
					<Icon icon="ph:minus-bold" />
				</Button>
				<input
					type="number"
					id="numPrinters"
					name="numPrinters"
					bind:value={numPrinters}
					min="1"
					required
					class="w-20 text-center px-3 py-2 bg-[#0c0c0c] border border-gray-600 rounded-md focus:ring-accent focus:border-accent text-white placeholder-gray-500 appearance-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
					aria-invalid={$page.form?.errors?.numPrinters ? 'true' : undefined}
					aria-describedby={$page.form?.errors?.numPrinters ? 'numPrinters-error' : undefined}
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					class="border-gray-600 hover:bg-gray-700"
					onclick={incrementPrinters}
				>
					<Icon icon="ph:plus-bold" />
				</Button>
			</div>
			{#if $page.form?.errors?.numPrinters}
				<p id="numPrinters-error" class="text-red-500 text-xs mt-1">{$page.form.errors.numPrinters}</p>
			{/if}
		</div>

		<!-- Filament Types -->
		<div>
			<label class="block text-sm font-medium text-gray-300 mb-2">Filament Types Supported</label>
			<div class="flex flex-wrap gap-2">
				{#each availableFilaments as filament}
					{@const isSelected = selectedFilaments.has(filament)}
					<!-- Hidden input for form submission -->
					{#if isSelected}
						<input type="hidden" name="selectedFilaments" value={filament} />
					{/if}
					<!-- Badge for UI interaction -->
					<Badge
						variant={isSelected ? 'default' : 'outline'}
						class="cursor-pointer transition-all {isSelected
							? 'bg-accent text-black hover:bg-accent/90 border-accent ring-1 ring-accent ring-offset-1 ring-offset-[#1a1a1a]' // Style for selected
							: 'border-gray-600 text-gray-400 hover:bg-gray-700/50'}"
						onclick={() => toggleFilament(filament)}
						aria-pressed={isSelected}
					>
						{filament}
					</Badge>
				{/each}
			</div>
			{#if $page.form?.errors?.selectedFilaments}
				<p class="text-red-500 text-xs mt-1">{$page.form.errors.selectedFilaments}</p>
			{/if}
		</div>

		<!-- Submit Button -->
		<div class="pt-4">
			<Button
				type="submit"
				class="w-full bg-accent hover:bg-accent/90 text-black"
				disabled={submitting}
			>
				Submit Application
			</Button>
		</div>
		</form>
	</div> <!-- Close relative container -->
{/if}
