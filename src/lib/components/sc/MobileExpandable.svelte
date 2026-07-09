<script lang="ts">
	import { browser } from '$app/environment';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/** Resets expanded state when this value changes (e.g. tab id). */
		resetKey?: string | number;
		/** Max height in px when collapsed. */
		collapsedMaxHeight?: number;
		class?: string;
		/** Tailwind gradient stop class, e.g. `from-card`. */
		fadeFromClass?: string;
	}

	let {
		children,
		resetKey,
		collapsedMaxHeight = 384,
		class: className,
		fadeFromClass = 'from-card'
	}: Props = $props();

	let contentEl = $state<HTMLElement | null>(null);
	let expanded = $state(false);
	let isOverflowing = $state(false);

	$effect(() => {
		void resetKey;
		expanded = false;
	});

	$effect(() => {
		if (!browser || !contentEl) return;

		const measure = () => {
			if (!contentEl) return;
			isOverflowing = contentEl.scrollHeight > collapsedMaxHeight + 1;
		};

		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(contentEl);

		return () => ro.disconnect();
	});

	const showCollapsed = $derived(isOverflowing && !expanded);
</script>

<div class={cn('relative', className)}>
	<div
		bind:this={contentEl}
		class={cn(
			'relative overflow-hidden transition-[max-height] duration-300 ease-out',
			showCollapsed && 'max-h-[var(--collapsed-max-h)]'
		)}
		style={showCollapsed ? `--collapsed-max-h: ${collapsedMaxHeight}px` : undefined}>
		{@render children()}

		{#if showCollapsed}
			<div
				class={cn(
					'pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent',
					fadeFromClass
				)}
				aria-hidden="true"></div>
		{/if}
	</div>

	{#if isOverflowing}
		<button
			type="button"
			class="mt-3 w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
			onclick={() => (expanded = !expanded)}>
			{expanded ? 'Show less' : 'See more'}
		</button>
	{/if}
</div>
