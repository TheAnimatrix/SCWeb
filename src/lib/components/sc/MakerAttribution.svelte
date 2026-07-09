<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getTierIcon, getTierStyle, getTierTextClass } from '$lib/types/tiers';
	import { cn } from '$lib/utils';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';

	interface Props {
		username: string;
		tier?: string | null;
		class?: string;
	}

	let { username, tier = 'Bee', class: className }: Props = $props();

	const displayName = $derived(formatUsernameDisplay(username));
	const tierIcon = $derived(getTierIcon(tier));
	const tierStyle = $derived(getTierStyle(tier));
	const tierTextClass = $derived(getTierTextClass(tier));
</script>

<div class={cn('flex min-w-0 items-center gap-1.5', className)}>
	{#if tierIcon}
		<span
			class="inline-flex size-3.5 shrink-0"
			style:filter={tierStyle.iconFilter ?? undefined}
			aria-hidden="true">
			<Icon icon={tierIcon} class="size-full" />
		</span>
	{/if}
	<span class={cn('truncate text-xs font-medium', tierTextClass)}>{displayName}</span>
</div>
