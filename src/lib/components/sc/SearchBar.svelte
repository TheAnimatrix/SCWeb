<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { cn } from '$lib/utils';

	interface Props {
		value?: string;
		placeholder?: string;
		class?: string;
		onsearch?: (query: string) => void;
	}

	let {
		value = '',
		placeholder = 'search parts, products, makers...',
		class: className,
		onsearch
	}: Props = $props();

	let query = $state('');

	$effect.pre(() => {
		query = value;
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		onsearch?.(query.trim());
	}
</script>

<form onsubmit={handleSubmit} class={cn('relative w-full', className)}>
	<Search
		class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
	<input
		type="search"
		bind:value={query}
		{placeholder}
		class="h-10 w-full rounded-md border border-border bg-card pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10"
	/>
</form>
