<script lang="ts">
	import { toastStore } from '$lib/client/toastStore';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import { cn } from '$lib/utils';

	type ToastType = 'info' | 'success' | 'error' | 'warning';

	const typeConfig: Record<
		ToastType,
		{ label: string; icon: typeof Info; accent: string; iconColor: string }
	> = {
		info: {
			label: 'info',
			icon: Info,
			accent: 'bg-[hsl(var(--info))]',
			iconColor: 'text-[hsl(var(--info))]'
		},
		success: {
			label: 'success',
			icon: CheckCircle2,
			accent: 'bg-[hsl(var(--success))]',
			iconColor: 'text-[hsl(var(--success))]'
		},
		error: {
			label: 'error',
			icon: CircleAlert,
			accent: 'bg-[hsl(var(--error))]',
			iconColor: 'text-[hsl(var(--error))]'
		},
		warning: {
			label: 'warning',
			icon: TriangleAlert,
			accent: 'bg-[hsl(var(--warning))]',
			iconColor: 'text-[hsl(var(--warning))]'
		}
	};

	const toastType = $derived(($toastStore.type || 'info') as ToastType);
	const config = $derived(typeConfig[toastType] ?? typeConfig.info);
	const IconComponent = $derived(config.icon);
</script>

{#if $toastStore.visible}
	<div
		class="pointer-events-none fixed bottom-4 right-4 z-[100] w-full max-w-sm px-4 sm:px-0"
		in:fly={{ y: 16, duration: 300, easing: cubicOut }}
		out:fade={{ duration: 150 }}
		role="status"
		aria-live="polite">
		<div
			class="pointer-events-auto overflow-hidden rounded-md border border-border bg-card shadow-lg">
			<div class="flex items-start gap-3 p-4">
				<div class={cn('mt-0.5 shrink-0', config.iconColor)} aria-hidden="true">
					<IconComponent class="size-4" />
				</div>

				<div class="min-w-0 flex-1 space-y-1">
					<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						{config.label}
					</p>
					<p class="text-sm leading-snug text-foreground">{$toastStore.message}</p>
				</div>

				<button
					type="button"
					class="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Dismiss notification"
					onclick={toastStore.hide}>
					<X class="size-3.5" />
				</button>
			</div>

			<div class={cn('h-0.5 w-full', config.accent)} aria-hidden="true"></div>
		</div>
	</div>
{/if}
