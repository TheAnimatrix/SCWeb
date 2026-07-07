<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		label: string;
		class?: string;
	}

	let { label, class: className }: Props = $props();
</script>

<p class={cn('mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground', className)}>
	// {label}
</p>
