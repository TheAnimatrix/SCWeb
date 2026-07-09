<script lang="ts">
	import { cn } from '$lib/utils';
	import { tagTintClass } from '$lib/utils/tagColors';

	interface Props {
		label: string;
		emphasized?: boolean;
		subtle?: boolean;
		class?: string;
	}

	let { label, emphasized = false, subtle = false, class: className }: Props = $props();

	const tintClass = $derived(emphasized || subtle ? '' : tagTintClass(label));
	const subtleClass = 'border-border bg-muted/40 text-muted-foreground';
</script>

<span
	class={cn(
 	'inline-flex max-w-full items-center rounded-md border text-xs font-medium',
		emphasized
			? 'relative overflow-hidden border-foreground/25 bg-muted px-2.5 py-1 font-semibold text-foreground'
			: cn('px-2 py-0.5', subtle ? subtleClass : tintClass),
		className
	)}
	data-emphasized={emphasized || undefined}>
	{#if emphasized}
		<span class="sc-stripes-bold pointer-events-none absolute inset-0" aria-hidden="true"></span>
	{/if}
	<span class={cn('break-words', emphasized && 'relative')}>{label}</span>
</span>
