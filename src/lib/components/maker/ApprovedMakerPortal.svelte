<script lang="ts">
	import FilamentManagement from './FilamentManagement.svelte';
	import OrderManagement from './OrderManagement.svelte';
	import { PortalCard } from '$lib/components/portal';
	import { Skeleton } from '$lib/components/sc';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import type { TypedSupabaseClient } from '$lib/types/database';
	import type { Filament } from '$lib/types/filament';

	let {
		supabase,
		session,
		makerName
	}: {
		supabase: TypedSupabaseClient;
		session: { data: { user: { id: string } } } | null;
		makerName?: string;
	} = $props();

	let key = $state(0);
</script>

<div class="space-y-6">
	<PortalCard>
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="space-y-1">
				<p class="text-foreground">
					<span class="text-sm text-muted-foreground">Welcome,</span>
					{#if makerName}
						<span class="ml-1 text-xl font-semibold tracking-tight md:text-2xl">{makerName}</span>
					{/if}
				</p>
				<p class="text-sm text-muted-foreground">
					Manage your filaments and respond to incoming print requests.
				</p>
			</div>

			{#key key}
				{#await supabase
					.from('UserFilament')
					.select('*')
					.eq('owner_id', session?.data.user.id ?? '')}
					<Skeleton class="h-9 w-56 rounded-md" />
				{:then filamentData}
					{#if filamentData && !filamentData.error && filamentData.data.length > 0}
						{#if filamentData.data.some((filament) => ((filament as Filament).quantity_kg ?? 0) <= 0)}
							<span
								class="inline-flex items-center gap-2 rounded-md border-2 border-warning/40 bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning">
								<AlertCircle class="size-4 shrink-0" strokeWidth={2} />
								Unlisted — add quantity to be visible
							</span>
						{:else}
							<span
								class="relative inline-flex items-center gap-2 overflow-hidden rounded-md border-2 border-foreground bg-foreground px-3 py-1.5 text-sm font-semibold text-background shadow-sm">
								<span
									class="sc-stripes-bold pointer-events-none absolute inset-0 opacity-20"
									aria-hidden="true"></span>
								<CircleCheck class="relative size-4 shrink-0" strokeWidth={2.25} />
								<span class="relative">Listed · visible to customers</span>
							</span>
						{/if}
					{:else}
						<span
							class="inline-flex items-center gap-2 rounded-md border-2 border-warning/40 bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning">
							<AlertCircle class="size-4 shrink-0" strokeWidth={2} />
							Unlisted — add filaments to be visible
						</span>
					{/if}
				{/await}
			{/key}
		</div>
	</PortalCard>

	<FilamentManagement
		{supabase}
		{session}
		onUpdate={() => {
			key++;
		}} />

	<OrderManagement {supabase} {session} />
</div>
