<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		count: number;
		class?: string;
	}

	let { count, class: className }: Props = $props();
</script>

<div class={cn(className)}>
	<p class="font-mono text-sm text-foreground">
		stock: {count} unit{count === 1 ? '' : 's'}
	</p>
</div>
