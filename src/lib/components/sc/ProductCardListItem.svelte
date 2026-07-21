<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<li class={cn('flex h-full min-h-0 w-full min-w-0', className)}>
	{@render children()}
</li>
