<script lang="ts">
	import { resolve } from '$app/paths';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();

	const STATUS_LABELS: Record<string, string> = {
		open: 'Open',
		launched: 'Launched',
		closed: 'Closed'
	};
</script>

<SeoHead meta={{ title: 'Admin · Interest checks', noindex: true }} />

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="text-2xl font-semibold">Interest checks</h1>

	{#if data.error}
		<p class="mt-4 text-sm text-destructive" role="alert">{data.error}</p>
	{/if}

	{#if data.campaigns.length}
		<div class="mt-6 overflow-x-auto rounded-md border border-border">
			<table class="w-full min-w-[36rem] text-left text-sm">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th scope="col" class="px-3 py-2 font-medium">Listing</th>
						<th scope="col" class="px-3 py-2 font-medium">Maker</th>
						<th scope="col" class="px-3 py-2 text-right font-medium">Interested</th>
						<th scope="col" class="px-3 py-2 text-right font-medium">Target</th>
						<th scope="col" class="px-3 py-2 font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.campaigns as campaign (campaign.productId)}
						<tr class="border-b border-border last:border-b-0">
							<td class="px-3 py-2">
								<a
									class="underline"
									href={resolve('/admin/interest/[productId]', {
										productId: campaign.productId
									})}>{campaign.productName}</a>
							</td>
							<td class="px-3 py-2">{campaign.makerName ?? ''}</td>
							<td class="px-3 py-2 text-right tabular-nums">{campaign.interest.interestedCount}</td>
							<td class="px-3 py-2 text-right tabular-nums">{campaign.interest.targetCount}</td>
							<td class="px-3 py-2"
								>{STATUS_LABELS[campaign.interest.status] ?? campaign.interest.status}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if !data.error}
		<p class="mt-6 text-sm text-muted-foreground">No interest checks yet.</p>
	{/if}
</div>
