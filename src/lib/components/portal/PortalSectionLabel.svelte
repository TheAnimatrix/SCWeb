<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		label: string;
		class?: string;
	}

	let { label, class: className }: Props = $props();

	// Sentence case: "model_details" -> "Model details".
	const displayLabel = $derived.by(() => {
		const text = label.replace(/_/g, ' ').trim();
		return text.charAt(0).toUpperCase() + text.slice(1);
	});
</script>

<p class={cn('mb-2 text-sm font-medium text-muted-foreground', className)}>
	{displayLabel}
</p>
