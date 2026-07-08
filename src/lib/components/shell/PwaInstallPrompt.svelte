<script lang="ts">
	import { onMount } from 'svelte';
	import Download from '@lucide/svelte/icons/download';
	import Share from '@lucide/svelte/icons/share';
	import { Button } from '$lib/components/ui/button';
	import { wasInstallPromptDismissed } from '$lib/client/pwaInstall';
	import {
		dismissInstallPrompt,
		initPwaInstallState,
		installEvent,
		installing,
		isIosDevice,
		isStandaloneDisplayMode,
		promptPwaInstall
	} from '$lib/client/pwaInstallState';

	let open = $state(false);
	let showIosInstructions = $state(false);

	$effect(() => {
		if ($installEvent) {
			showIosInstructions = false;
		}
	});

	onMount(() => {
		initPwaInstallState();

		if (isStandaloneDisplayMode() || wasInstallPromptDismissed()) {
			return;
		}

		if (isIosDevice()) {
			showIosInstructions = true;
		}

		const timer = window.setTimeout(() => {
			open = true;
		}, 1500);

		return () => {
			window.clearTimeout(timer);
		};
	});

	async function handleInstall() {
		if (!$installEvent) return;

		const outcome = await promptPwaInstall();

		if (outcome === 'accepted') {
			open = false;
		} else if (outcome === 'dismissed') {
			dismissInstallPrompt();
		}
	}

	function handleDismiss() {
		dismissInstallPrompt();
		open = false;
	}
</script>

{#if open}
	<div
		class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:rounded-lg sm:border"
		role="dialog"
		aria-labelledby="pwa-install-title"
		aria-describedby="pwa-install-description">
		<div class="flex items-start gap-3">
			<div class="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-background">
				<img src="/pwa/pwa-192.png" alt="" class="size-full" width="40" height="40" />
			</div>

			<div class="min-w-0 flex-1 space-y-3">
				<div>
					<p id="pwa-install-title" class="font-semibold text-foreground">Install Selfcrafted</p>
					<p id="pwa-install-description" class="mt-1 text-sm text-muted-foreground">
						{#if showIosInstructions && !$installEvent}
							Add this app to your home screen for quick access and a full-screen experience.
						{:else if $installEvent}
							Install the app for faster access, offline browsing, and a native-like experience.
						{:else}
							Install this app from your browser menu for quicker access and offline browsing.
						{/if}
					</p>
				</div>

				{#if showIosInstructions && !$installEvent}
					<ol class="space-y-1 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<Share class="size-4 shrink-0" />
							<span>Tap Share in Safari</span>
						</li>
						<li class="flex items-center gap-2">
							<Download class="size-4 shrink-0" />
							<span>Select Add to Home Screen</span>
						</li>
					</ol>
				{/if}

				<div class="flex flex-wrap gap-2">
					{#if $installEvent}
						<Button onclick={handleInstall} disabled={$installing}>
							{$installing ? 'Installing…' : 'Install app'}
						</Button>
					{/if}
					<Button variant="outline" onclick={handleDismiss}>
						{showIosInstructions && !$installEvent ? 'Not now' : 'Maybe later'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
