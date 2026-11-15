<script lang="ts">
	import { F } from '$lib/icons/fluent';

	import Icon from '@iconify/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	/**
	 * Confirmation dialog built on the bits-ui Dialog (focus trap, Escape, overlay click,
	 * theme tokens). Props are unchanged from the earlier hand-rolled version.
	 */
	let {
		open = $bindable(false),
		title = 'Are you sure?',
		message = 'This cannot be undone.',
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

	// Fires for Escape, overlay clicks and the close button. Programmatic `open = false`
	// from the buttons above does not trigger it, so onCancel runs exactly once.
	function handleOpenChange(next: boolean) {
		if (!next) onCancel();
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-md border-border bg-card text-card-foreground">
		<div class="flex items-start gap-4 pr-6">
			<div
				class="flex shrink-0 items-center justify-center rounded-full bg-destructive/10 p-2"
				aria-hidden="true">
				<Icon icon={F.warning} class="size-5 text-destructive" />
			</div>
			<Dialog.Header class="text-left">
				<Dialog.Title class="text-lg font-semibold text-foreground">{title}</Dialog.Title>
				<Dialog.Description class="text-sm text-muted-foreground">{message}</Dialog.Description>
			</Dialog.Header>
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button variant="outline" onclick={handleCancel}>{cancelText}</Button>
			<Button variant="destructive" onclick={handleConfirm}>{confirmText}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
