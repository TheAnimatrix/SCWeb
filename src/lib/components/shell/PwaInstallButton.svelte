<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Download from '@lucide/svelte/icons/download';
	import Share from '@lucide/svelte/icons/share';
	import {
		dismissInstallPrompt,
		initPwaInstallState,
		installEvent,
		installing,
		isIosDevice,
		isStandaloneDisplayMode,
		promptPwaInstall
	} from '$lib/client/pwaInstallState';

	let showIosInstructions = $state(false);
	let container = $state<HTMLElement | null>(null);

	const showInstall = $derived(
		browser &&
			!isStandaloneDisplayMode() &&
			($installEvent !== null || isIosDevice())
	);

	onMount(() => {
		initPwaInstallState();

		const handleClickOutside = (event: MouseEvent) => {
			if (!container?.contains(event.target as Node)) {
				showIosInstructions = false;
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	async function handleInstall() {
		if ($installEvent) {
			const outcome = await promptPwaInstall();
			if (outcome === 'dismissed') {
				dismissInstallPrompt();
			}
			return;
		}

		if (isIosDevice()) {
			showIosInstructions = !showIosInstructions;
		}
	}
</script>

{#if showInstall}
	<div class="relative" bind:this={container}>
		<button
			type="button"
			class="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
			onclick={(event) => {
				event.stopPropagation();
				void handleInstall();
			}}
			disabled={$installing}
			aria-expanded={showIosInstructions}
			aria-haspopup={isIosDevice() && !$installEvent ? 'dialog' : undefined}
		>
			<Download class="size-3" aria-hidden="true" />
			<span>{$installing ? 'installing…' : 'install_app'}</span>
		</button>

		{#if showIosInstructions && isIosDevice() && !$installEvent}
			<div
				role="region"
				aria-label="Install on iOS"
				class="absolute bottom-full right-0 z-50 mb-2 w-56 rounded-md border border-border bg-card p-3 shadow-lg"
			>
				<p class="mb-2 text-xs text-muted-foreground">Add to your home screen:</p>
				<ol class="space-y-1.5 text-xs text-muted-foreground">
					<li class="flex items-center gap-2">
						<Share class="size-3.5 shrink-0" aria-hidden="true" />
						<span>Tap Share in Safari</span>
					</li>
					<li class="flex items-center gap-2">
						<Download class="size-3.5 shrink-0" aria-hidden="true" />
						<span>Select Add to Home Screen</span>
					</li>
				</ol>
			</div>
		{/if}
	</div>
{/if}
