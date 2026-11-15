<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { cn } from '$lib/utils';
	import ScInput from './ScInput.svelte';

	interface Props {
		value?: string;
		placeholder?: string;
		/** Id for the input, so a link like `/crafts#search` can focus it. */
		inputId?: string;
		class?: string;
		onsearch?: (query: string) => void;
	}

	let {
		value = '',
		// Search matches product names and maker names only.
		placeholder = 'Search by product or maker name',
		inputId,
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

	/** Emptying the box (including the native ✕ clear button) resets results right away. */
	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (target.value === '' && value !== '') {
			onsearch?.('');
		}
	}
</script>

<form
	onsubmit={handleSubmit}
	class={cn('flex w-full items-stretch gap-2', className)}
	role="search">
	<div class="min-w-0 flex-1">
		<ScInput
			id={inputId}
			type="search"
			bind:value={query}
			{placeholder}
			icon={F.search}
			aria-label="Search the shop"
			oninput={handleInput} />
	</div>
	<button
		type="submit"
		class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted">
		<Icon icon={F.search} class="size-4 sm:hidden" aria-hidden="true" />
		<span class="sr-only sm:not-sr-only">Search</span>
	</button>
</form>
