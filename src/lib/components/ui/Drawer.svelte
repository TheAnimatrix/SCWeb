<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		position: 'left' | 'right' | 'bottom';
		showBackdrop?: boolean;
		closeOnBackdropClick?: boolean;
		closeOnEsc?: boolean;
		close?: () => void;
		trigger: Snippet<[boolean, () => void]>;
		content: Snippet<[() => void]>;
	}

	let {
		open,
		position,
		showBackdrop = true,
		closeOnBackdropClick = true,
		closeOnEsc = true,
		close = () => {},
		trigger,
		content
	}: Props = $props();

	function handleClose() {
		open = false;
		close();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (closeOnEsc && e.key === 'Escape' && open) {
			handleClose();
		}
	}

	function handleOutsideClick(e: MouseEvent) {
		if (closeOnBackdropClick && (e.target as HTMLElement).classList.contains('drawer-backdrop')) {
			handleClose();
		}
	}
	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{@render trigger(open, handleClose)}

{#if open}
	<!-- Backdrop -->
	<button
		type="button"
		class="drawer-backdrop h-[100svh] fixed inset-0 bg-black/60 z-50 backdrop-blur-sm {!showBackdrop
			? 'opacity-0 invisible'
			: 'opacity-100'}"
		onclick={handleOutsideClick}
		aria-label="Close Drawer"
		transition:fade={{ duration: 200 }}>
	</button>

	<!-- Drawer Content -->
	<div
		class="fixed z-50 inset-0 h-[100svh] flex flex-col w-[100svw] justify-end pointer-events-none">
		<div
			class="w-full border-[#ffffff]/10 border-t-1 bg-[#151515]/60 backdrop-blur-xl text-white transition-transform duration-300 ease-out flex flex-col shadow-2xl pointer-events-auto"
			transition:fly={{
				duration: 300,
				easing: quintOut,
				x: position === 'left' ? -100 : position === 'right' ? 100 : 0,
				y: position === 'bottom' ? 100 : 0
			}}>
			{@render content(handleClose)}
		</div>
	</div>
{/if}
