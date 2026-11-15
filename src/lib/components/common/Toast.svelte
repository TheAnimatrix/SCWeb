<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { toastStore } from '$lib/client/toastStore';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { cn } from '$lib/utils';

	type ToastType = 'info' | 'success' | 'error' | 'warning';

	const typeConfig: Record<
		ToastType,
		{ label: string; icon: string; accent: string; iconColor: string }
	> = {
		info: {
			label: 'Info',
			icon: F.info,
			accent: 'bg-[hsl(var(--info))]',
			iconColor: 'text-[hsl(var(--info))]'
		},
		success: {
			label: 'Done',
			icon: F.checkCircle,
			accent: 'bg-[hsl(var(--success))]',
			iconColor: 'text-[hsl(var(--success))]'
		},
		error: {
			label: 'Error',
			icon: F.errorCircle,
			accent: 'bg-[hsl(var(--error))]',
			iconColor: 'text-[hsl(var(--error))]'
		},
		warning: {
			label: 'Warning',
			icon: F.warning,
			accent: 'bg-[hsl(var(--warning))]',
			iconColor: 'text-[hsl(var(--warning))]'
		}
	};

	const toastType = $derived(($toastStore.type || 'info') as ToastType);
	const config = $derived(typeConfig[toastType] ?? typeConfig.info);
	const toastIcon = $derived(config.icon);
	const isError = $derived(toastType === 'error');
</script>

{#if $toastStore.visible}
	<div
		class="pointer-events-none fixed inset-x-4 bottom-4 z-[100] sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
		in:fly={{ y: 16, duration: 300, easing: cubicOut }}
		out:fade={{ duration: 150 }}
		role={isError ? 'alert' : 'status'}
		aria-live={isError ? 'assertive' : 'polite'}>
		<div
			class="pointer-events-auto overflow-hidden rounded-md border border-border bg-card shadow-lg">
			<div class="flex items-start gap-3 p-4">
				<div class={cn('mt-0.5 shrink-0', config.iconColor)} aria-hidden="true">
					<Icon icon={toastIcon} class="size-4" />
				</div>

				<div class="min-w-0 flex-1 space-y-1">
					<p class="text-xs font-medium text-muted-foreground">
						{config.label}
					</p>
					<p class="text-sm leading-snug text-foreground">{$toastStore.message}</p>
				</div>

				<button
					type="button"
					class="-m-1.5 inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Dismiss notification"
					onclick={toastStore.hide}>
					<Icon icon={F.dismiss} class="size-3.5" />
				</button>
			</div>

			<div class={cn('h-0.5 w-full', config.accent)} aria-hidden="true"></div>
		</div>
	</div>
{/if}
