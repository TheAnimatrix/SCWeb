<script lang="ts">
	import FilamentManagement from './FilamentManagement.svelte';
	import OrderManagement from './OrderManagement.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Icon from '@iconify/svelte';

	// Props expected from the parent page
	let {
		supabase_lt,
		session,
		makerName
	}: {
		supabase_lt: SupabaseClient;
		session: { data: { user: { id: string } } } | null;
		makerName?: string;
	} = $props();

	let key = $state(0);

	// Add other state or logic specific to the approved portal view if needed later

	//is the user listed ?
	//1. No filamnts
	//2. Filaments but no quantity
</script>

<div class="relative flex flex-col items-center justify-center min-h-[320px]">
	<!-- Accent Glow Background -->
	<div
		class="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-40 bg-accent opacity-20 blur-[100px] rounded-full pointer-events-none z-0">
	</div>

	<!-- Glassy Card with darker gray -->
	<div
		class="relative z-10 w-full max-w-4xl mx-auto sm:px-5 xs:px-2 sm:py-7 xs:py-7 rounded-2xl border border-[#232323]/80 bg-[#101010]/60 backdrop-blur-lg shadow-glow-subtle">
		<div class="mb-1 text-center">
			<p class="text-base font-medium text-white/80">
				Welcome{makerName ? `, ${makerName}` : ''}!
			</p>
			<p class="text-xs text-gray-500 mt-1">
				You're now in the Maker Portal. Manage your filaments and get ready for print jobs!
			</p>
			{#key key}
			{#await supabase_lt.from('UserFilament').select('*').eq('owner_id', session?.data.user.id)}
				<!-- iconify spinner -->
				<div class="flex justify-center items-center">
					<Icon
						icon="material-symbols:hourglass-empty"
						class="text-gray-500 text-2xl animate-spin" />
				</div>
			{:then data}
				{#if data && !data.error && data.data.length > 0}
					{#if data.data.some((filament) => filament.quantity_kg <= 0)}
						<div
							class="mt-2 px-3 py-1.5 bg-amber-800/30 border border-amber-700/40 rounded-md inline-flex items-center">
							<Icon icon="material-symbols:info-outline" class="text-amber-500 mr-2 text-sm" />
							<span class="text-xs text-amber-200"
								>Status: <span class="font-medium">Unlisted</span> - Add quantity to your filaments to
								be visible</span>
						</div>
					{:else}
						<div
							class="mt-2 px-3 py-1.5 bg-green-800/30 border border-green-700/40 rounded-md inline-flex items-center">
							<Icon
								icon="material-symbols:check-circle-outline"
								class="text-green-500 mr-2 text-sm" />
							<span class="text-xs text-green-200"
								>Status: <span class="font-medium">Listed</span> - You are visible to customers</span>
						</div>
					{/if}
				{:else}
					<div
						class="mt-2 px-3 py-1.5 bg-amber-800/30 border border-amber-700/40 rounded-md inline-flex items-center">
						<Icon icon="material-symbols:info-outline" class="text-amber-500 mr-2 text-sm" />
						<span class="text-xs text-amber-200"
							>Status: <span class="font-medium">Unlisted</span> - Add filaments to be visible to customers</span>
					</div>
				{/if}
			{/await}
			{/key}
		</div>

		<!-- Filament Management Section -->
		<div class="mt-6">
			<FilamentManagement {supabase_lt} {session} onUpdate={() => {
				key++;
			}} />
		</div>

		<!-- Order Management Section -->
		<div class="mt-6">
			<OrderManagement {supabase_lt} {session} />
		</div>

		<!-- Add other approved maker sections here later -->
		<!-- e.g., <OrderQueue {supabase_lt} {session} /> -->
		<!-- e.g., <PrinterStatus {supabase_lt} {session} /> -->
	</div>
</div>
