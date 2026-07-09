<script lang="ts">
	import Skeleton from './Skeleton.svelte';
</script>

<div class="@container overflow-hidden rounded-lg border border-border bg-card" aria-hidden="true">
	<div class="border-b border-border bg-muted/40 px-4 py-2">
		<Skeleton class="h-3 w-16 rounded-sm" />
	</div>

	<div
		class="grid grid-cols-[minmax(0,36%)_1fr] @min-[400px]:grid-cols-[minmax(0,42%)_1fr] @min-[520px]:grid-cols-[minmax(0,200px)_1fr] @min-[640px]:grid-cols-[minmax(0,240px)_1fr]">
		<Skeleton class="aspect-[4/5] rounded-none border-0 @min-[520px]:aspect-auto @min-[520px]:min-h-[180px]" />
		<div class="flex flex-col justify-between gap-4 p-4 @min-[520px]:p-6">
			<div class="space-y-3">
				<Skeleton class="h-5 w-3/4 rounded-sm" />
				<div class="space-y-2">
					<Skeleton class="h-3 w-1/2 rounded-sm" />
					<Skeleton class="h-3 w-2/5 rounded-sm" />
					<Skeleton class="h-3 w-1/3 rounded-sm" />
				</div>
			</div>
			<Skeleton class="ml-auto h-6 w-20 rounded-sm" />
		</div>
	</div>
</div>
