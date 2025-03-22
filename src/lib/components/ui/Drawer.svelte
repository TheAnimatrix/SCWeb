<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		open: boolean;
		position: 'left' | 'right' | 'bottom';
		showBackdrop?: boolean;
		closeOnBackdropClick?: boolean;
		closeOnEsc?: boolean;
		close?: () => void;
		trigger: (open: boolean, handleClose: () => void) => any;
		content: (handleClose: () => void) => any;
	}

	let {
		open,
		position,
		showBackdrop = true,
		closeOnBackdropClick = true,
		closeOnEsc = true,
		close = ()=>{},
		trigger,
		content
	} : Props = $props();

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
	let positionClassValues = {
			left: 'inset-y-0 left-0 max-w-xs w-full transform -translate-x-full',
			right: 'inset-y-0 right-0 max-w-xs w-full transform translate-x-full',
			bottom: 'inset-x-0 bottom-0 max-h-[85vh] transform translate-y-full'
		};
	let transformClassValues = {
			left: 'translate-x-0',
			right: 'translate-x-0',
			bottom: 'translate-y-0'
	};
	let positionClass = $derived(positionClassValues[position]);
	let transformClass = $derived(transformClassValues[position]);

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
		class="drawer-backdrop h-[100svh] fixed inset-0 bg-black/60 z-50 backdrop-blur-sm {!showBackdrop ? 'opacity-0 invisible' : 'opacity-100'}"
		onclick={handleOutsideClick}
		aria-label="Close Drawer"
		transition:fade={{ duration: 200 }}>
	</button>

	<!-- Drawer Content -->
	<div class="fixed z-50 inset-0 h-[100svh] flex flex-col w-[100svw] justify-end pointer-events-none">

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
