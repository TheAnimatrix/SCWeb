<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		rating: number;
		username: string;
		timeAgo: string;
		comment: string;
		class?: string;
	}

	let { rating, username, timeAgo, comment, class: className }: Props = $props();
</script>

<article class={cn('rounded-lg border border-border bg-card p-4', className)}>
	<div class="mb-2 flex items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<span class="font-mono text-sm text-foreground" aria-label="{rating} out of 5 stars">
				★{rating}
			</span>
			<span class="font-mono text-sm text-foreground">@{username}</span>
		</div>
		<time class="font-mono text-xs text-muted-foreground">{timeAgo}</time>
	</div>
	<p class="text-sm leading-relaxed text-foreground">{comment}</p>
</article>
