<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	let { 
		open = $bindable(false),
		title = 'Confirm Action',
		message = 'Are you sure you want to proceed?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		onConfirm = () => {},
		onCancel = () => {}
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	} = $props();

	function handleConfirm() {
		onConfirm();
		open = false;
	}

	function handleCancel() {
		onCancel();
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
		onclick={handleCancel}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="bg-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-md m-4 border border-[#333]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
		>
			<div class="p-6">
				<div class="flex items-start gap-4">
					<div class="bg-red-900/30 rounded-full p-2 flex items-center justify-center shrink-0">
						<Icon icon="ph:warning-bold" class="text-xl text-red-400" />
					</div>
					<div class="flex-grow">
						<h2 id="dialog-title" class="text-lg font-semibold text-gray-100">{title}</h2>
						<p class="mt-1 text-sm text-gray-400">{message}</p>
					</div>
					<button
						onclick={handleCancel}
						class="p-1 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full"
						aria-label="Close dialog"
					>
						<Icon icon="ph:x-bold" class="text-lg" />
					</button>
				</div>
			</div>

			<div class="bg-[#222] px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-[#333]">
				<button
					onclick={handleCancel}
					class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
				>
					{cancelText}
				</button>
				<button
					onclick={handleConfirm}
					class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if} 