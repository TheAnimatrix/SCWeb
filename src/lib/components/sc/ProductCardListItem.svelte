<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<li class={cn('flex min-w-0 max-h-[20rem]', className)}>
	{@render children()}
</li>
