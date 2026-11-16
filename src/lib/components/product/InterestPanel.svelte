<script lang="ts" module>
	import type { ProductInterest } from '@scweb/api/contracts';
	import type { Address } from '$lib/types/product';

	export interface InterestViewer {
		/** Signed-in user id, or null for guests. */
		userId: string | null;
		email: string | null;
		/** First guess (by `uid`) that the signed-in user made this listing; the API confirms it. */
		isOwner: boolean;
		/** Where "Sign in to show interest" goes. */
		signInHref: string;
	}

	/**
	 * Shared between the purchase panel (which owns the dialogs) and the page's sticky mobile bar,
	 * so both buttons open the same flow and show the same count.
	 */
	export class InterestState {
		readonly productId: string;
		readonly productName: string;
		readonly makerName: string;
		readonly interest: ProductInterest;
		readonly viewer: InterestViewer;
		readonly loadAddresses: () => Promise<Address[] | undefined>;

		interestedCount = $state(0);
		/** null until the API has said whether this buyer is on the list. */
		onList = $state<boolean | null>(null);
		/** Whether this is the viewer's own listing: `ownListing` from the API once it answers. */
		ownListing = $state(false);
		joinOpen = $state(false);
		leaveOpen = $state(false);

		constructor(options: {
			productId: string;
			productName: string;
			makerName: string;
			interest: ProductInterest;
			viewer: InterestViewer;
			loadAddresses: () => Promise<Address[] | undefined>;
		}) {
			this.productId = options.productId;
			this.productName = options.productName;
			this.makerName = options.makerName;
			this.interest = options.interest;
			this.viewer = options.viewer;
			this.loadAddresses = options.loadAddresses;
			this.interestedCount = options.interest.interestedCount;
			this.ownListing = options.viewer.isOwner;
			// Guests are never on the list; nothing to ask the API.
			if (!options.viewer.userId) this.onList = false;
		}

		get isOpen() {
			return this.interest.status === 'open';
		}

		get signedIn() {
			return this.viewer.userId !== null;
		}

		get targetReached() {
			return this.interestedCount >= this.interest.targetCount;
		}

		/** 0 to 1, for the bar. */
		get progress() {
			const target = this.interest.targetCount;
			if (target <= 0) return 1;
			return Math.min(this.interestedCount / target, 1);
		}

		/** Opens the join dialog (signed-in buyers who aren't on the list yet). */
		startJoin() {
			if (!this.signedIn || this.ownListing || this.onList) return;
			this.joinOpen = true;
		}
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { ScButton, Skeleton } from '$lib/components/sc';
	import * as Dialog from '$lib/components/ui/dialog';
	import { getMyInterest, showInterest, withdrawInterest } from '$lib/client/interestApi';
	import { toastStore } from '$lib/client/toastStore';
	import { newAddress } from '$lib/types/product';
	import { formatInr } from '$lib/utils/format';

	interface Props {
		interestState: InterestState;
		price: number;
		oldPrice?: number | null;
	}

	let { interestState: interest, price, oldPrice = null }: Props = $props();

	const target = $derived(interest.interest.targetCount);
	const count = $derived(interest.interestedCount);
	const days = $derived(interest.interest.shipsWithinDays);
	const note = $derived(interest.interest.note?.trim() || null);

	// Ask the API whether this buyer is already on the list, without holding up the page.
	$effect(() => {
		const current = interest;
		if (current.onList !== null) return;
		let cancelled = false;
		void getMyInterest(fetch, current.productId).then((result) => {
			if (cancelled) return;
			// If the check fails, offer the button: posting again only updates the address.
			if (result.ok) current.ownListing = result.data.ownListing;
			current.onList = result.ok ? result.data.interested : false;
		});
		return () => {
			cancelled = true;
		};
	});

	// Saved addresses for the dialog, fetched the first time it opens.
	let addresses = $state<Address[] | undefined>();
	let addressesLoaded = $state(false);
	let selector: AddressInputSelector | undefined = $state();
	let address = $state<Address>(newAddress());
	let addressValid = $state(false);
	let joining = $state(false);
	let joinError = $state('');
	let leaving = $state(false);
	let leaveError = $state('');

	let actionsEl = $state<HTMLElement | null>(null);
	let onListHeading = $state<HTMLElement | null>(null);
	/** Where focus goes when a dialog closes after its action changed the panel. */
	let focusAfterClose: 'onList' | 'actions' | null = null;

	$effect(() => {
		if (!interest.joinOpen) return;
		joinError = '';
		if (addressesLoaded) return;
		void interest.loadAddresses().then((list) => {
			addresses = list;
			addressesLoaded = true;
		});
	});

	$effect(() => {
		if (interest.leaveOpen) leaveError = '';
	});

	async function submitJoin() {
		if (joining) return;
		joinError = '';
		const ok = selector ? await selector.validateAndFocus() : addressValid;
		if (!ok) return;

		joining = true;
		try {
			const result = await showInterest(fetch, interest.productId, address);
			if (!result.ok) {
				joinError = result.error.message;
				return;
			}
			interest.interestedCount = result.data.interestedCount;
			interest.onList = result.data.interested;
			focusAfterClose = 'onList';
			interest.joinOpen = false;
		} finally {
			joining = false;
		}
	}

	async function submitLeave() {
		if (leaving) return;
		leaveError = '';
		leaving = true;
		try {
			const result = await withdrawInterest(fetch, interest.productId);
			if (!result.ok) {
				leaveError = result.error.message;
				return;
			}
			interest.interestedCount = result.data.interestedCount;
			interest.onList = result.data.interested;
			focusAfterClose = 'actions';
			interest.leaveOpen = false;
			toastStore.show("You're off the list.", 'success');
		} finally {
			leaving = false;
		}
	}

	async function handleCloseAutoFocus(event: Event) {
		const next = focusAfterClose;
		focusAfterClose = null;
		if (!next) return;
		// The button that opened the dialog has been replaced; focus what took its place.
		event.preventDefault();
		await tick();
		if (next === 'onList') {
			onListHeading?.focus();
		} else {
			actionsEl?.querySelector<HTMLElement>('a, button')?.focus();
		}
	}

	const buttonClass =
		'min-h-11 w-full whitespace-normal text-sm disabled:pointer-events-none disabled:opacity-50';
	const secondaryClass =
		'inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50';
</script>

<div class="space-y-5">
	<div class="space-y-1">
		<p class="text-sm text-muted-foreground">Expected price</p>
		{#if oldPrice && oldPrice > price}
			<p class="text-sm text-muted-foreground line-through">
				<span class="sr-only">Was </span>{formatInr(oldPrice)}
			</p>
		{/if}
		<p class="text-3xl font-semibold tracking-tight text-foreground">{formatInr(price)}</p>
	</div>

	<div class="space-y-3 rounded-md border border-border bg-muted/30 p-4">
		<div class="space-y-1.5">
			<div
				class="h-2 w-full overflow-hidden rounded-full bg-muted"
				role="progressbar"
				aria-label="{count} of {target} people interested"
				aria-valuemin={0}
				aria-valuemax={target}
				aria-valuenow={Math.min(count, target)}>
				<div
					class="h-full rounded-full bg-foreground transition-[width] duration-500"
					style:width="{interest.progress * 100}%">
				</div>
			</div>
			<p class="text-sm font-medium tabular-nums text-foreground" aria-hidden="true">
				{count} of {target} interested
			</p>
		</div>

		<p class="text-sm text-muted-foreground">
			{#if interest.targetReached}
				The list is full. Ships within {days} days.
			{:else}
				Gets made when the list is full. Ships within {days} days of that.
			{/if}
		</p>
		{#if note}
			<p class="whitespace-pre-line break-words text-sm text-muted-foreground">{note}</p>
		{/if}
	</div>

	<div class="space-y-2" bind:this={actionsEl}>
		{#if interest.ownListing}
			<p class="text-sm text-muted-foreground">
				This is your listing. Manage it in the
				<a
					href={resolve('/portal/listings')}
					class="text-foreground underline underline-offset-2 hover:decoration-2">maker portal</a
				>.
			</p>
		{:else if !interest.signedIn}
			<ScButton class={buttonClass} href={interest.viewer.signInHref} arrow>
				Sign in to show interest
			</ScButton>
			<p class="text-xs text-muted-foreground">
				Free, and not an order. We'll email you a link to buy when it launches.
			</p>
		{:else if interest.onList === null}
			<div aria-busy="true">
				<Skeleton class="h-11 w-full rounded-md" />
			</div>
		{:else if interest.onList}
			<div class="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-3">
				<h2
					bind:this={onListHeading}
					tabindex="-1"
					class="text-sm font-medium text-foreground focus:outline-none">
					You're on the list.
				</h2>
				{#if interest.viewer.email}
					<p class="text-sm text-muted-foreground">
						We'll email {interest.viewer.email} when it launches.
					</p>
				{/if}
				<a
					href={resolve('/user/profile/interest')}
					class="block text-sm text-foreground underline underline-offset-2 hover:decoration-2"
					>Manage this in your account</a>
				<button
					type="button"
					class="min-h-11 text-sm text-foreground underline underline-offset-2 hover:decoration-2 md:min-h-0"
					onclick={() => (interest.leaveOpen = true)}>
					Take me off the list
				</button>
			</div>
		{:else}
			<ScButton class={buttonClass} onclick={() => interest.startJoin()} arrow>
				Show interest
			</ScButton>
			<p class="text-xs text-muted-foreground">
				Free, and not an order. We'll email you a link to buy when it launches.
			</p>
		{/if}
	</div>
</div>

<Dialog.Root bind:open={interest.joinOpen}>
	<Dialog.Content
		class="max-h-[90dvh] max-w-lg overflow-y-auto"
		onCloseAutoFocus={handleCloseAutoFocus}>
		<Dialog.Header>
			<Dialog.Title>Show interest in {interest.productName}</Dialog.Title>
			<Dialog.Description>
				Tell us where it would ship. This helps the maker plan the batch. It isn't an order and you
				pay nothing.
			</Dialog.Description>
		</Dialog.Header>

		{#if addressesLoaded}
			<AddressInputSelector
				bind:this={selector}
				email={interest.viewer.email ?? undefined}
				userExists={true}
				{addresses}
				idPrefix="interest"
				autocompleteSection="shipping"
				bind:address
				bind:addressValid />
		{:else}
			<div class="space-y-3" aria-busy="true" aria-label="Loading your addresses">
				<Skeleton class="h-10 w-full rounded-md" />
				<Skeleton class="h-10 w-full rounded-md" />
				<Skeleton class="h-10 w-2/3 rounded-md" />
			</div>
		{/if}

		<p class="text-xs leading-relaxed text-muted-foreground">
			Selfcrafted keeps your address and phone number for this interest check. The maker sees only
			how many people are interested and roughly where they are. We delete your address and phone
			number when you leave the list, when it launches, or if it is called off.
		</p>

		{#if joinError}
			<p class="text-sm text-destructive" role="alert">{joinError}</p>
		{/if}

		<div class="flex gap-3">
			<button type="button" class={secondaryClass} onclick={() => (interest.joinOpen = false)}>
				Cancel
			</button>
			<ScButton
				class="min-h-11 flex-1 whitespace-normal text-sm disabled:pointer-events-none disabled:opacity-50"
				disabled={joining || !addressesLoaded}
				onclick={submitJoin}>
				{joining ? 'Adding you…' : 'Add me to the list'}
			</ScButton>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={interest.leaveOpen}>
	<Dialog.Content class="max-w-md" onCloseAutoFocus={handleCloseAutoFocus}>
		<Dialog.Header>
			<Dialog.Title>Remove yourself from the list for {interest.productName}?</Dialog.Title>
		</Dialog.Header>

		{#if leaveError}
			<p class="text-sm text-destructive" role="alert">{leaveError}</p>
		{/if}

		<div class="flex gap-3">
			<button type="button" class={secondaryClass} onclick={() => (interest.leaveOpen = false)}>
				Stay on the list
			</button>
			<ScButton
				class="min-h-11 flex-1 whitespace-normal text-sm disabled:pointer-events-none disabled:opacity-50"
				disabled={leaving}
				onclick={submitLeave}>
				Remove me
			</ScButton>
		</div>
	</Dialog.Content>
</Dialog.Root>
