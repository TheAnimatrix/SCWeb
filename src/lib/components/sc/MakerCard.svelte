<script lang="ts">
	import { cn } from '$lib/utils';
	import ScButton from './ScButton.svelte';

	interface Props {
		name: string;
		location: string;
		craftCount: number;
		memberSince: string;
		shopHref: string;
		class?: string;
	}

	let { name, location, craftCount, memberSince, shopHref, class: className }: Props = $props();

	const initial = $derived(name.charAt(0).toUpperCase());
</script>

<div class={cn('rounded-lg border border-border bg-card p-4', className)}>
	<div class="flex items-start gap-4">
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-sm font-medium uppercase text-foreground"
			aria-hidden="true"
		>
			{initial}
		</div>

		<div class="min-w-0 flex-1 space-y-1">
			<h3 class="truncate text-sm font-medium text-foreground">{name}</h3>
			<p class="font-mono text-xs text-muted-foreground">{location}</p>
			<p class="font-mono text-xs text-muted-foreground">
				{craftCount} crafts · member since {memberSince}
			</p>
		</div>
	</div>

	<div class="mt-4">
		<ScButton variant="ghost" href={shopHref} arrow class="text-sm">
			view_shop
		</ScButton>
	</div>
</div>
