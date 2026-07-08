<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		src?: string | null;
		alt: string;
		class?: string;
		loading?: 'lazy' | 'eager';
	}

	let { src, alt, class: className, loading = 'lazy' }: Props = $props();

	let failedKey = $state<string | null>(null);

	const currentKey = $derived(src ?? '');
	const showPlaceholder = $derived(!src || failedKey === currentKey);

	function handleError() {
		failedKey = currentKey;
	}
</script>

{#if showPlaceholder}
	<div class={cn('sc-stripes h-full w-full', className)} role="img" aria-label={alt}></div>
{:else}
	<img
		{src}
		{alt}
		class={cn('h-full w-full object-cover', className)}
		{loading}
		onerror={handleError} />
{/if}
