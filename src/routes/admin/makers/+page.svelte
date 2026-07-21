<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { reviewApplication } from '$lib/client/makersApi';
	import { ScButton } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();
	let busyId = $state('');

	async function review(id: string, decision: 'approved' | 'rejected') {
		busyId = id;
		await reviewApplication(fetch, id, decision);
		busyId = '';
		await invalidateAll();
	}
</script>

<SeoHead meta={{ title: 'Admin · Makers', noindex: true }} />

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="text-2xl font-semibold">Maker applications</h1>
	<p class="mt-1 text-sm text-muted-foreground">Approve or reject pending maker applications.</p>

	{#if data.error}
		<p class="mt-4 text-sm text-destructive">{data.error}</p>
	{/if}

	<div class="mt-6 space-y-3">
		{#each data.applications as app (app.id)}
			<div class="rounded-md border border-border p-4">
				<p class="font-medium">{app.display_name || app.username || app.user_id}</p>
				<p class="font-mono text-xs text-muted-foreground">
					{(app.requested_capabilities as string[] | undefined)?.join(', ')}
				</p>
				<div class="mt-3 flex gap-2">
					<ScButton
						disabled={busyId === app.id}
						onclick={() => review(String(app.id), 'approved')}>Approve</ScButton>
					<ScButton
						variant="secondary"
						disabled={busyId === app.id}
						onclick={() => review(String(app.id), 'rejected')}>Reject</ScButton>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No pending applications.</p>
		{/each}
	</div>
</div>
