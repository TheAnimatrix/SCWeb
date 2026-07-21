<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

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
	<ScInput type="search" bind:value={query} {placeholder} icon={F.search} class="font-mono" />
</form>
