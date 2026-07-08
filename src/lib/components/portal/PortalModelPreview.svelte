<script lang="ts">
	import FileBox from '@lucide/svelte/icons/file-box';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Upload from '@lucide/svelte/icons/upload';
	import ModelViewer from '$lib/components/ModelViewer.svelte';
	import { cn } from '$lib/utils';

	function formatDimension(value: number): string {
		return value.toFixed(2) + ' mm';
	}

	interface Props {
		modelLoaded: boolean;
		modelFile: File | null;
		modelColor: string;
		selectedMaterial: string;
		selectedScale: number;
		selectedInfill: number;
		selectedQuality: string;
		selectedWalls: number;
		dragActive?: boolean;
		cubeContainer?: HTMLElement | null;
		onCubeMouseEnter?: () => void;
		onCubeMouseLeave?: () => void;
		onFailedLoad?: () => void;
		onReplace?: () => void;
		onBrowse?: () => void;
		onFileChange?: (e: Event) => void;
		ondragover?: (e: DragEvent) => void;
		ondragleave?: () => void;
		ondrop?: (e: DragEvent) => void;
		modelViewer?: ModelViewer;
		class?: string;
	}

	let {
		modelLoaded,
		modelFile,
		modelColor,
		selectedMaterial,
		selectedScale,
		selectedInfill,
		selectedQuality,
		selectedWalls,
		dragActive = false,
		cubeContainer = $bindable(null),
		onCubeMouseEnter,
		onCubeMouseLeave,
		onFailedLoad,
		onReplace,
		onBrowse,
		onFileChange,
		ondragover,
		ondragleave,
		ondrop,
		modelViewer = $bindable(),
		class: className
	}: Props = $props();

	let modelInfo = $state({
		dimensions: { x: 0, y: 0, z: 0 },
		fileSize: '0 KB',
		vertexCount: 0,
		triangleCount: 0,
		isCalculating: false
	});

	const fileSize = $derived(modelFile ? `${(modelFile.size / (1024 * 1024)).toFixed(2)} MB` : null);
</script>

<input type="file" id="fileInput" accept=".stl" onchange={onFileChange} class="hidden" />

<div
	class={cn(
		'relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-lg border border-border bg-background',
		!modelLoaded && dragActive && 'border-foreground/40 ring-2 ring-foreground/10',
		className
	)}
	role="region"
	aria-label="Model preview and upload"
	{ondragover}
	{ondragleave}
	{ondrop}>
	<div
		class="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 text-xs">
		<span class="font-medium text-muted-foreground">Model preview</span>
		{#if modelLoaded && modelFile}
			<div class="flex items-center gap-2 text-foreground">
				<FileBox class="size-3.5" strokeWidth={1.5} />
				<span class="max-w-[12rem] truncate">{modelFile.name}</span>
				<span class="text-muted-foreground">({fileSize})</span>
			</div>
		{:else}
			<span class="text-muted-foreground">No file yet · STL only</span>
		{/if}
	</div>

	<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
		{#if modelLoaded && modelFile}
			<div class="relative min-h-[18rem] flex-1 overflow-hidden">
				<ModelViewer
					bind:this={modelViewer}
					bind:modelInfo
					file={modelFile}
					{modelColor}
					{selectedMaterial}
					{selectedScale}
					{selectedInfill}
					{selectedQuality}
					{selectedWalls}
					{onFailedLoad} />
			</div>

			<div
				class="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
				<div class="text-xs">
					<div class="mb-2 text-xs font-medium text-muted-foreground">Model info</div>
					<div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
						<span class="text-muted-foreground">Size</span>
						<span class="text-foreground">{modelInfo.fileSize}</span>

						<span class="text-muted-foreground">Dimensions</span>
						<span class="text-foreground">
							{formatDimension(modelInfo.dimensions.x * selectedScale)} ×
							{formatDimension(modelInfo.dimensions.y * selectedScale)} ×
							{formatDimension(modelInfo.dimensions.z * selectedScale)}
						</span>
					</div>
				</div>

				{#if onReplace}
					<button
						type="button"
						class="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 sm:self-auto"
						onclick={onReplace}>
						<RefreshCw class="size-3.5" strokeWidth={1.5} />
						Replace
					</button>
				{/if}
			</div>
		{:else}
			<button
				type="button"
				class="group flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 p-8 transition-colors hover:bg-muted/20"
				onclick={onBrowse}>
				<div
					bind:this={cubeContainer}
					class="cube-container"
					onmouseenter={onCubeMouseEnter}
					onmouseleave={onCubeMouseLeave}
					role="presentation">
				</div>
				<div class="text-center">
					<div
						class="mb-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
						<Upload class="size-4" strokeWidth={1.5} />
						Upload model
					</div>
					<p class="text-xs text-muted-foreground">Drop an STL here, or click to browse files</p>
					<p class="mt-2 text-xs text-muted-foreground">STL · max 50MB</p>
				</div>
			</button>
		{/if}
	</div>
</div>

<style>
	.cube-container {
		width: 200px;
		height: 200px;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: transform 0.3s ease;
	}

	.cube-container:hover {
		transform: scale(1.02);
	}

	.cube-container :global(canvas) {
		display: block;
		border-radius: 4px;
	}
</style>
