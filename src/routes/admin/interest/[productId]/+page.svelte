<script lang="ts">
	import { resolve } from '$app/paths';
	import { buildInterestCsv, entryAddressLine } from '$lib/client/adminInterestApi';
	import { toastStore } from '$lib/client/toastStore';
	import { ScButton } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';
	import { formatDateTime } from '$lib/utils/format';

	let { data } = $props();

	const list = $derived(data.list);
	const entries = $derived(list?.entries ?? []);
	let copyError = $state('');

	/** The API blanks phone and address after a launch or closure. */
	function cell(value: string | null | undefined): string {
		return value ? value : '—';
	}

	async function copyCsv() {
		copyError = '';
		try {
			await navigator.clipboard.writeText(buildInterestCsv(entries));
			toastStore.show('Copied.', 'success');
		} catch {
			copyError = "Couldn't copy. Your browser blocked the clipboard.";
		}
	}
</script>

<SeoHead meta={{ title: 'Admin · Interest', noindex: true }} />

<div class="mx-auto max-w-6xl px-4 py-8">
	<p class="text-sm">
		<a class="underline" href={resolve('/admin/interest')}>Interest checks</a>
	</p>

	{#if data.error}
		<p class="mt-4 text-sm text-destructive" role="alert">{data.error}</p>
	{/if}

	{#if list}
		<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-semibold">{list.productName}: who is interested</h1>
			{#if entries.length}
				<ScButton variant="secondary" onclick={copyCsv}>Copy as CSV</ScButton>
			{/if}
		</div>
		<p class="mt-1 text-sm text-muted-foreground">
			{list.interest.interestedCount} of {list.interest.targetCount} interested
		</p>
		{#if copyError}
			<p class="mt-2 text-sm text-destructive" role="alert">{copyError}</p>
		{/if}

		{#if entries.length}
			<div class="mt-6 overflow-x-auto rounded-md border border-border">
				<table class="w-full min-w-[64rem] text-left text-sm">
					<thead class="border-b border-border text-muted-foreground">
						<tr>
							<th scope="col" class="px-3 py-2 font-medium">Name</th>
							<th scope="col" class="px-3 py-2 font-medium">Email</th>
							<th scope="col" class="px-3 py-2 font-medium">Phone</th>
							<th scope="col" class="px-3 py-2 font-medium">Address</th>
							<th scope="col" class="px-3 py-2 font-medium">City</th>
							<th scope="col" class="px-3 py-2 font-medium">State</th>
							<th scope="col" class="px-3 py-2 font-medium">Pincode</th>
							<th scope="col" class="px-3 py-2 font-medium">Joined</th>
							<th scope="col" class="px-3 py-2 font-medium">Emailed</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as entry (entry.id)}
							<tr class="border-b border-border align-top last:border-b-0">
								<td class="px-3 py-2">{cell(entry.name)}</td>
								<td class="px-3 py-2">{cell(entry.email)}</td>
								<td class="whitespace-nowrap px-3 py-2">{cell(entry.phone)}</td>
								<td class="px-3 py-2">{cell(entryAddressLine(entry))}</td>
								<td class="px-3 py-2">{cell(entry.address?.city)}</td>
								<td class="px-3 py-2">{cell(entry.address?.state)}</td>
								<td class="px-3 py-2">{cell(entry.address?.pincode)}</td>
								<td class="whitespace-nowrap px-3 py-2">{formatDateTime(entry.createdAt)}</td>
								<td class="whitespace-nowrap px-3 py-2"
									>{cell(formatDateTime(entry.notifiedAt))}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="mt-6 text-sm text-muted-foreground">Nobody has shown interest yet.</p>
		{/if}
	{/if}
</div>
