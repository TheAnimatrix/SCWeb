<script lang="ts">
	import type { MyInterestItem } from '@scweb/api/contracts';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import { withdrawInterest } from '$lib/client/interestApi';
	import { toastStore } from '$lib/client/toastStore';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();

	// The load runs once per visit; removals then edit this copy.
	// svelte-ignore state_referenced_locally
	let interests = $state<MyInterestItem[]>(data.interests);
	const loadError = $derived(data.loadError);

	let confirmOpen = $state(false);
	let pending = $state<MyInterestItem | null>(null);
	let removingId = $state<string | null>(null);

	function askRemove(item: MyInterestItem) {
		pending = item;
		confirmOpen = true;
	}

	async function confirmRemove() {
		const item = pending;
		pending = null;
		if (!item || removingId) return;
		removingId = item.productId;
		try {
			const result = await withdrawInterest(fetch, item.productId);
			if (!result.ok) {
				toastStore.show(result.error.message, 'error');
				return;
			}
			interests = interests.filter((row) => row.productId !== item.productId);
			toastStore.show("You're off the list.", 'success');
		} finally {
			removingId = null;
		}
	}

	function statusLine(item: MyInterestItem): string {
		if (item.status === 'closed') return 'The maker decided not to produce this.';
		if (item.productPath === null) return "This listing isn't public at the moment.";
		if (item.status === 'launched') return 'Launched. You can buy it now.';
		return `${item.interestedCount} of ${item.targetCount} interested`;
	}
</script>

<div class="space-y-4">
	<div class="space-y-1">
		<h2 class="text-lg font-semibold tracking-tight">Interest checks</h2>
		<p class="text-sm text-muted-foreground">
			Products you've shown interest in. You can take yourself off any list here.
		</p>
	</div>

	{#if loadError}
		<div
			role="alert"
			class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{loadError}
		</div>
	{:else if interests.length === 0}
		<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">You haven't shown interest in anything yet.</p>
		</div>
	{:else}
		<ul class="space-y-3">
			{#each interests as item (item.productId)}
				<li
					class="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="min-w-0 space-y-1">
						{#if item.productPath}
							<!-- eslint-disable svelte/no-navigation-without-resolve -- listing path from the API -->
							<a
								href={item.productPath}
								class="break-words font-medium text-foreground underline-offset-2 hover:underline"
								>{item.productName}</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{:else}
							<p class="break-words font-medium text-foreground">{item.productName}</p>
						{/if}
						<p class="text-sm text-muted-foreground">{statusLine(item)}</p>
						<p class="text-xs text-muted-foreground">On the list since {formatDate(item.since)}</p>
					</div>
					<button
						type="button"
						class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
						disabled={removingId !== null}
						onclick={() => askRemove(item)}>
						Take me off the list
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<ConfirmDialog
	bind:open={confirmOpen}
	title={`Remove yourself from the list for ${pending?.productName ?? ''}?`}
	message=""
	confirmText="Remove me"
	cancelText="Stay on the list"
	onConfirm={confirmRemove}
	onCancel={() => (pending = null)} />
