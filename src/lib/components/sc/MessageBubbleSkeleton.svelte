<script lang="ts">
	import { cn } from '$lib/utils';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		align?: 'left' | 'right';
		class?: string;
	}

	let { align = 'left', class: className }: Props = $props();
</script>

<div
	class={cn('flex', align === 'right' ? 'justify-end' : 'justify-start', className)}
	aria-hidden="true">
	<Skeleton class="h-10 w-48 max-w-[75%] rounded-lg" />
</div>
