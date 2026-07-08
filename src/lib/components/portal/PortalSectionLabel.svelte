<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		label: string;
		class?: string;
	}

	let { label, class: className }: Props = $props();

	const displayLabel = $derived(
		label.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
	);
</script>

<p class={cn('mb-2 text-xs font-medium text-muted-foreground', className)}>
	{displayLabel}
</p>
