<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { cn } from '$lib/utils';
	import ScInput from './ScInput.svelte';

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

<form onsubmit={handleSubmit} class={cn('w-full', className)}>
	<ScInput
		type="search"
		bind:value={query}
		{placeholder}
		icon={Search}
		class="font-mono"
	/>
</form>
