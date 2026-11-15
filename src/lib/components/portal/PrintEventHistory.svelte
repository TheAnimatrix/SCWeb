<script lang="ts">
	import { cn } from '$lib/utils';
	import { formatDateTime, formatInr } from '$lib/utils/format';
	import { formatPrintEventAmountInr } from '$lib/types/printEventMoney';
	import {
		printEventActor,
		printEventLabel,
		type PrintRequestEvent
	} from '$lib/types/printRequest';
	import PortalCard from './PortalCard.svelte';
	import PortalSectionLabel from './PortalSectionLabel.svelte';

	interface Props {
		events: PrintRequestEvent[];
		viewer: 'customer' | 'maker';
	}

	let { events, viewer }: Props = $props();

	function eventAmount(event: PrintRequestEvent): string | null {
		const amount = formatPrintEventAmountInr(event.extra);
		return amount == null ? null : formatInr(Number(amount));
	}
</script>

<PortalCard>
	<PortalSectionLabel label="History" />
	{#if events.length > 0}
		<ol class="mt-3 flex flex-col gap-2">
			{#each events as event (event.timestamp + event.type)}
				{@const amount = eventAmount(event)}
				<li
					class={cn(
						'rounded-md border px-4 py-3 text-sm',
						event.type === 'cancelled'
							? 'border-destructive/30 bg-destructive/5'
							: event.type === 'paid'
								? 'border-border bg-muted/30'
								: 'border-border bg-card'
					)}>
					<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
						<span class="font-medium text-foreground">
							{printEventLabel(event.type)}{amount ? `: ${amount}` : ''}
						</span>
						<time class="text-xs text-muted-foreground" datetime={event.timestamp}>
							{formatDateTime(event.timestamp)}
						</time>
					</div>
					{#if typeof event.reason === 'string' && event.reason}
						<p class="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.reason}</p>
					{/if}
					{#if event.type === 'paid' && event.extra?.payment_id_b}
						<p class="mt-1 text-xs text-muted-foreground">
							Payment ref {event.extra.payment_id_b} (keep this if you contact support)
						</p>
					{/if}
					<p class="mt-1 text-xs text-muted-foreground">
						By {printEventActor(event.by, viewer)}
					</p>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="mt-3 text-sm text-muted-foreground">
			Nothing yet. Quotes, payments and cancellations will show here.
		</p>
	{/if}
</PortalCard>
