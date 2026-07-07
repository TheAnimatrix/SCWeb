<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		current: number;
		total: number;
		class?: string;
	}

	let { current, total, class: className }: Props = $props();

	const percentage = $derived(total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0);
</script>

<div class={cn('space-y-2', className)}>
	<p class="font-mono text-sm text-foreground">
		stock: {current}/{total} units
	</p>
	<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
		<div
			class="h-full rounded-full bg-foreground transition-all duration-300"
			style="width: {percentage}%"
			role="progressbar"
			aria-valuenow={current}
			aria-valuemin={0}
			aria-valuemax={total}
			aria-label="Stock availability"
		></div>
	</div>
</div>
