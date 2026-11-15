<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		rating: number;
		/** Display name, already formatted. */
		username: string;
		/** Relative time, e.g. "2 months ago". */
		timeAgo: string;
		/** Absolute date, shown on hover, e.g. "15 Nov 2026". */
		date?: string;
		comment: string;
		class?: string;
	}

	let { rating, username, timeAgo, date, comment, class: className }: Props = $props();

	const stars = $derived(Math.max(0, Math.min(5, Math.round(rating))));
</script>

<article class={cn('rounded-lg border border-border bg-card p-4', className)}>
	<div class="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
		<div class="flex min-w-0 items-center gap-2">
			<span
				class="shrink-0 text-base leading-none tracking-tight"
				role="img"
				aria-label="{stars} out of 5 stars">
				{#each [...Array(5).keys()] as index (index)}
					<span
						class={index < stars ? 'text-amber-400' : 'text-muted-foreground/30'}
						aria-hidden="true">★</span>
				{/each}
			</span>
			<span class="truncate text-sm font-medium text-foreground">{username}</span>
		</div>
		<time class="text-xs text-muted-foreground" title={date}>{timeAgo}</time>
	</div>
	<p class="whitespace-pre-line text-sm leading-relaxed text-foreground">{comment}</p>
</article>
