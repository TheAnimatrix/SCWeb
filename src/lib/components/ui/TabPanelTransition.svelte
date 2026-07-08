<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import { getTabFlyIn, getTabFlyOut } from '$lib/utils/tabTransition';
	import type { Snippet } from 'svelte';

	interface Props {
		tabKey: string | number;
		class?: string;
		children: Snippet;
	}

	let { tabKey, class: className, children }: Props = $props();
</script>

<div class={cn('tab-panel-transition grid', className)}>
	{#key tabKey}
		<div
			class="col-start-1 row-start-1 min-w-0"
			in:fly={getTabFlyIn()}
			out:fly={getTabFlyOut()}
		>
			{@render children()}
		</div>
	{/key}
</div>
