<script lang="ts">
	import Skeleton from './Skeleton.svelte';
	import CheckoutLineSkeleton from './CheckoutLineSkeleton.svelte';
</script>

<div class="rounded-lg border border-border bg-card" aria-hidden="true">
	<div class="flex items-center gap-2 border-b border-border px-5 py-4">
		<Skeleton class="size-4 rounded-sm" />
		<Skeleton class="h-4 w-28 rounded-sm" />
	</div>

	<div class="space-y-4 p-5">
		<CheckoutLineSkeleton count={2} />

		<div class="space-y-3 border-t border-border pt-4">
			<div class="flex items-center justify-between">
				<Skeleton class="h-4 w-16 rounded-sm" />
				<Skeleton class="h-4 w-20 rounded-sm" />
			</div>
			<div class="flex items-center justify-between border-b border-border pb-4">
				<div class="space-y-1">
					<Skeleton class="h-4 w-20 rounded-sm" />
					<Skeleton class="h-3 w-28 rounded-sm" />
				</div>
				<Skeleton class="h-4 w-16 rounded-sm" />
			</div>
			<div class="flex items-center justify-between">
				<Skeleton class="h-5 w-12 rounded-sm" />
				<Skeleton class="h-6 w-24 rounded-sm" />
			</div>
		</div>

		<Skeleton class="h-10 w-full rounded-md" />
		<Skeleton class="mx-auto h-4 w-32 rounded-sm" />
	</div>
</div>
