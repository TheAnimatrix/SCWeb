<script lang="ts">
	import { toastStore } from '$lib/client/toastStore';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';

	type ToastType = 'info' | 'success' | 'error' | 'warning';

	// Map toast types to icons
	const typeIcons = {
		info: 'ph:info-bold',
		success: 'ph:check-circle-bold',
		error: 'ph:x-circle-bold',
		warning: 'ph:warning-bold'
	};

	// Map toast types to Tailwind classes for background, border, and icon
	const typeClasses = {
		info: {
			bg: 'bg-[hsl(var(--info)/0.1)]',
			border: 'border-[hsl(var(--info))]',
			icon: 'text-[hsl(var(--info))]'
		},
		success: {
			bg: 'bg-[hsl(var(--success)/0.1)]',
			border: 'border-[hsl(var(--success))]',
			icon: 'text-[hsl(var(--success))]'
		},
		error: {
			bg: 'bg-[hsl(var(--error)/0.1)]',
			border: 'border-[hsl(var(--error))]',
			icon: 'text-[hsl(var(--error))]'
		},
		warning: {
			bg: 'bg-[hsl(var(--warning)/0.1)]',
			border: 'border-[hsl(var(--warning))]',
			icon: 'text-[hsl(var(--warning))]'
		}
	};

	let icon = $derived(typeIcons[$toastStore.type] || typeIcons.info);
	let toastType = $derived($toastStore.type || 'info');
	let toastClasses = $derived(typeClasses[toastType] || typeClasses.info);
</script>

{#if $toastStore.visible}
	<div
		in:fly={{ y: 20, duration: 400, easing: cubicOut }}
		out:fade={{ duration: 200 }}
		class="fixed bottom-5 right-5 z-[100] max-w-sm w-full rounded-2xl overflow-hidden"
	>
		<!-- Main toast container with styling matching the site theme -->
		<div class={`backdrop-blur-xl rounded-2xl p-4 shadow-glow transition-all duration-300 hover:shadow-glow-lg border ${toastClasses.bg} ${toastClasses.border}`}>
			<div class="flex items-center">
				<!-- Icon with type color -->
				<Icon icon={icon} class={`text-xl mr-2 flex-shrink-0 ${toastClasses.icon}`} />
				<!-- Message text -->
				<span class="text-sm font-medium text-white">{$toastStore.message}</span>
				<!-- Close button -->
				<button
					type="button"
					class="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
					aria-label="Close"
					onclick={toastStore.hide}
				>
					<span class="sr-only">Close</span>
					<Icon icon="ph:x-bold" class="text-lg" />
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Copied directly from the sign-in page for consistency */
	.shadow-glow {
		box-shadow: 0 4px 20px -5px rgba(194, 255, 0, 0.1);
	}

	.shadow-glow-lg {
		box-shadow: 0 8px 30px -5px rgba(194, 255, 0, 0.2);
	}

	/* Ensure high z-index */
	.z-\[100\] {
		z-index: 100;
	}
</style>