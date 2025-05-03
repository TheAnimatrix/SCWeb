<script lang="ts">
	import FilamentManagement from './FilamentManagement.svelte';
	import type { SupabaseClient, Session } from '@supabase/supabase-js';

	// Props expected from the parent page
	let { supabase_lt, session, makerName }: { supabase_lt: SupabaseClient, session: Session | null, makerName?: string } = $props();

	// Add other state or logic specific to the approved portal view if needed later
</script>

<div class="relative flex flex-col items-center justify-center min-h-[320px]">
	<!-- Accent Glow Background -->
	<div class="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-40 bg-accent opacity-20 blur-[100px] rounded-full pointer-events-none z-0"></div>

	<!-- Glassy Card with darker gray -->
	<div class="relative z-10 w-full max-w-2xl mx-auto px-5 py-7 rounded-2xl border border-[#232323]/80 bg-[#101010]/60 backdrop-blur-lg shadow-glow-subtle">
		<div class="mb-1 text-center">
			<p class="text-base font-medium text-white/80">
				Welcome{makerName ? `, ${makerName}` : ''}!
			</p>
			<p class="text-xs text-gray-500 mt-1">You're now in the Maker Portal. Manage your filaments and get ready for print jobs!</p>
		</div>

		<!-- Filament Management Section -->
		<div class="mt-6">
			<FilamentManagement {supabase_lt} {session} />
		</div>

		<!-- Add other approved maker sections here later -->
		<!-- e.g., <OrderQueue {supabase_lt} {session} /> -->
		<!-- e.g., <PrinterStatus {supabase_lt} {session} /> -->
	</div>
</div>