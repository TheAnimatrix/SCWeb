<script lang="ts">
	import Upload from '@lucide/svelte/icons/upload';
	import { cn } from '$lib/utils';

	interface Props {
		dragActive?: boolean;
		hasModel?: boolean;
		fileName?: string | null;
		ondragover?: (e: DragEvent) => void;
		ondragleave?: () => void;
		ondrop?: (e: DragEvent) => void;
		onbrowse?: () => void;
		onfilechange?: (e: Event) => void;
		class?: string;
	}

	let {
		dragActive = false,
		hasModel = false,
		fileName = null,
		ondragover,
		ondragleave,
		ondrop,
		onbrowse,
		onfilechange,
		class: className
	}: Props = $props();
</script>

<button
	type="button"
	class={cn(
		'group flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all',
		dragActive
			? 'border-foreground bg-muted/60 scale-[1.01]'
			: hasModel
				? 'border-border bg-muted/20 hover:border-foreground/25 hover:bg-muted/40'
				: 'border-border bg-card hover:border-foreground/30 hover:bg-muted/30',
		className
	)}
	ondragover={ondragover}
	ondragleave={ondragleave}
	ondrop={ondrop}
	onclick={onbrowse}
>
	<div
		class={cn(
			'mb-3 flex size-12 items-center justify-center rounded-full border transition-colors',
			dragActive ? 'border-foreground bg-foreground text-background' : 'border-border bg-muted/50 text-muted-foreground group-hover:border-foreground/30'
		)}
	>
		<Upload class="size-5" strokeWidth={1.5} />
	</div>

	<div class="space-y-1">
		<div class="font-mono text-sm text-foreground">
			{hasModel ? 'upload_different_model' : 'upload_model'}
		</div>
		{#if hasModel && fileName}
			<p class="font-mono text-xs text-muted-foreground">
				current: <span class="text-foreground">{fileName}</span>
			</p>
		{:else}
			<p class="text-xs text-muted-foreground">
				Drag & drop your STL here, or <span class="underline decoration-border underline-offset-2">browse files</span>
			</p>
		{/if}
		<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">STL · max 50MB</p>
	</div>

	<input type="file" id="fileInput" accept=".stl" onchange={onfilechange} class="hidden" />
</button>
