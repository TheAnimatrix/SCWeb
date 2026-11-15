<script lang="ts">
	import type { FullAutoFill } from 'svelte/elements';
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { tick, untrack } from 'svelte';
	import {
		ADDRESS_FIELD_ORDER,
		type Address,
		type AddressField,
		newAddress,
		normalizeAddress,
		normalizeAddressForSave,
		validateAddressFields
	} from '$lib/types/product';
	import { ScButton, ScInput } from '$lib/components/sc';
	import AddressLocationFields from '$lib/components/fundamental/AddressLocationFields.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		/** Account e-mail. When missing (guests), the form asks for an e-mail. */
		email: string | undefined;
		userExists?: boolean;
		addresses: Address[] | undefined;
		/** 'text' shows a chosen address, 'edit' shows the form. */
		type?: string;
		/** True when `address` can be used to pay. Updated live while typing. */
		addressValid?: boolean;
		address?: Address;
		address_old?: Address;
		title?: string;
		/** Prefix for input ids, so two forms on one page (shipping and billing) don't clash. */
		idPrefix?: string;
		autocompleteSection?: 'shipping' | 'billing';
		class?: string;
	}

	let {
		email,
		userExists = false,
		addresses,
		type = $bindable('text'),
		addressValid = $bindable(false),
		address = $bindable(newAddress()),
		address_old = $bindable(newAddress()),
		title = 'Shipping address',
		idPrefix = 'address',
		autocompleteSection,
		class: className = ''
	}: Props = $props();

	function withoutCountryCode(phone: string | undefined) {
		if (!phone) return '';
		if (phone.startsWith('+91')) return phone.substring(3);
		return phone;
	}

	function toEditableFields(addr: Address) {
		const normalized = normalizeAddress(addr);
		return {
			name: normalized.name ?? '',
			line1: normalized.line1 ?? '',
			line2: normalized.line2 ?? '',
			city: normalized.city ?? '',
			pincode: normalized.pincode ?? '',
			state: normalized.state ?? '',
			phone: withoutCountryCode(normalized.phone),
			email: normalized.email ?? ''
		};
	}

	function hasContent(addr: Address | undefined) {
		return Boolean(addr && (addr.name || addr.line1 || addr.pincode || addr.phone));
	}

	const checkEmail = $derived(!email);
	const savedAddresses = $derived(addresses ?? []);
	const autocompletePrefix = $derived(autocompleteSection ? `${autocompleteSection} ` : '');
	const autofill = (token: string) => `${autocompletePrefix}${token}` as FullAutoFill;

	let editableAddress = $state(toEditableFields(newAddress()));
	/** Saved-address id being edited; undefined for a new address. */
	let editingId: string | undefined = $state();
	let touched: Partial<Record<AddressField, boolean>> = $state({});
	let showAllErrors = $state(false);
	let needsUpdateReason: string | null = $state(null);
	let showAddressList = $state(false);

	const candidate = $derived(
		normalizeAddressForSave({ ...editableAddress, id: editingId, created_at: undefined })
	);
	const fieldErrors = $derived(type === 'edit' ? validateAddressFields(candidate, checkEmail) : {});

	function visibleError(field: AddressField): string | undefined {
		if (!showAllErrors && !touched[field]) return undefined;
		return fieldErrors[field];
	}

	function markTouched(field: AddressField) {
		touched = { ...touched, [field]: true };
	}

	// While the form is open, keep the bound address and its validity in step with what is typed,
	// so the parent's Pay button never waits on a separate "Save" press.
	$effect(() => {
		if (type !== 'edit') return;
		const next = candidate;
		const valid = Object.keys(fieldErrors).length === 0;
		untrack(() => {
			address = next;
			addressValid = valid;
		});
	});

	function openForm(from: Address | undefined, id: string | undefined) {
		editableAddress = toEditableFields(from ?? newAddress());
		editingId = id;
		touched = {};
		showAllErrors = false;
		showAddressList = false;
		type = 'edit';
	}

	function selectSaved(addr: Address) {
		const normalized = normalizeAddressForSave(normalizeAddress(addr));
		const errors = validateAddressFields(normalized, checkEmail);
		const firstError = ADDRESS_FIELD_ORDER.map((field) => errors[field]).find(Boolean);
		showAddressList = false;

		if (!firstError) {
			needsUpdateReason = null;
			address = normalized;
			address_old = { ...normalized };
			addressValid = true;
			type = 'text';
			return;
		}

		// Saved before today's rules: open it for editing and say what to fix.
		address_old = { ...normalized };
		openForm(normalized, normalized.id);
		needsUpdateReason = firstError;
		showAllErrors = true;
	}

	function startNewAddress() {
		if (address.id) address_old = { ...address };
		needsUpdateReason = null;
		openForm(undefined, undefined);
		addressValid = false;
	}

	function editCurrent() {
		address_old = { ...address };
		needsUpdateReason = null;
		openForm(address, address.id);
	}

	function cancelEdit() {
		if (address_old.id) selectSaved(address_old);
	}

	const canCancelEdit = $derived(
		type === 'edit' && Boolean(address_old.id) && savedAddresses.length > 0 && !needsUpdateReason
	);

	untrack(() => {
		if (userExists && savedAddresses.length > 0) {
			selectSaved(savedAddresses[0]);
		} else {
			// Guests, or signed-in buyers with no saved address. Keep any prefill (billing copy).
			openForm(hasContent(address) ? address : undefined, undefined);
		}
	});

	/**
	 * Called by the parent when the buyer presses Pay: shows every error, focuses the first
	 * invalid field and returns whether the address can be used.
	 */
	export async function validateAndFocus(): Promise<boolean> {
		if (type !== 'edit') return addressValid;
		showAllErrors = true;
		const firstInvalid = ADDRESS_FIELD_ORDER.find((field) => fieldErrors[field]);
		if (!firstInvalid) return true;
		showAddressList = false;
		await tick();
		const el = document.getElementById(`${idPrefix}-${firstInvalid}`);
		el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		el?.focus({ preventScroll: true });
		return false;
	}

	function describedBy(field: AddressField) {
		return visibleError(field) ? `${idPrefix}-${field}-error` : undefined;
	}

	const labelClass = 'text-sm font-medium text-foreground';
</script>

<div class={cn('overflow-hidden md:rounded-lg md:border md:border-border md:bg-card', className)}>
	<div class="flex items-center justify-between gap-3 border-b border-border py-4 md:px-5">
		<h2 class="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
			<Icon icon={F.location} class="size-4 shrink-0 text-foreground" aria-hidden="true" />
			{title}
		</h2>
		{#if userExists && savedAddresses.length > 0 && !showAddressList}
			<ScButton variant="ghost" class="min-h-10 text-sm" onclick={() => (showAddressList = true)}>
				Change
			</ScButton>
		{/if}
	</div>

	<div class="py-5 md:p-5">
		{#if showAddressList}
			<div class="space-y-2">
				{#each savedAddresses as addrItem (addrItem.id ?? addrItem.line1)}
					<button
						type="button"
						class={cn(
							'flex w-full flex-col rounded-md border p-4 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-muted/40',
							addrItem.id && addrItem.id === address.id ? 'border-foreground/40' : 'border-border'
						)}
						onclick={() => selectSaved(addrItem)}>
						<p class="font-medium text-foreground">{addrItem.name || ''}</p>
						<p class="mt-1 text-muted-foreground">{addrItem.line1 || ''}</p>
						{#if addrItem.line2}
							<p class="text-muted-foreground">{addrItem.line2}</p>
						{/if}
						<p class="text-muted-foreground">
							{addrItem.city || ''}, {addrItem.state || ''}
							{addrItem.pincode || ''}
						</p>
						{#if addrItem.phone}
							<p class="mt-2 flex items-center gap-1.5 text-muted-foreground">
								<Icon icon={F.phone} class="size-3.5" aria-hidden="true" />
								+91 {withoutCountryCode(addrItem.phone)}
							</p>
						{/if}
					</button>
				{/each}
				<div class="flex flex-wrap items-center justify-between gap-3 pt-2">
					<ScButton variant="secondary" onclick={startNewAddress}>
						<Icon icon={F.add} class="mr-2 inline size-4" aria-hidden="true" />
						Add a new address
					</ScButton>
					<ScButton variant="ghost" onclick={() => (showAddressList = false)}>Cancel</ScButton>
				</div>
			</div>
		{:else if type === 'text'}
			<div class="space-y-3 text-sm text-foreground">
				<p class="text-base font-medium">{address.name}</p>

				<div class="space-y-0.5">
					<p>{address.line1}</p>
					{#if address.line2}
						<p class="text-muted-foreground">{address.line2}</p>
					{/if}
					<p>{address.city}, {address.state} {address.pincode}</p>
				</div>

				{#if address.phone}
					<p class="flex items-center gap-2">
						<Icon icon={F.phone} class="size-4 text-muted-foreground" aria-hidden="true" />
						+91 {withoutCountryCode(address.phone)}
					</p>
				{/if}

				{#if address.email && !email}
					<p class="flex items-center gap-2">
						<Icon icon={F.mail} class="size-4 text-muted-foreground" aria-hidden="true" />
						{address.email}
					</p>
				{/if}

				<div class="flex flex-wrap items-center gap-3 border-t border-border pt-4">
					<ScButton variant="secondary" onclick={editCurrent}>
						<Icon icon={F.edit} class="mr-2 inline size-4" aria-hidden="true" />
						Edit
					</ScButton>
					<ScButton variant="ghost" onclick={startNewAddress}>Use a different address</ScButton>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				{#if needsUpdateReason}
					<p
						class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
						role="status">
						This address needs an update: {needsUpdateReason}
					</p>
				{/if}

				<div class="space-y-1.5">
					<ScInput
						id="{idPrefix}-name"
						label="Full name"
						{labelClass}
						icon={F.person}
						placeholder="Name of the person receiving the parcel"
						autocomplete={autofill('name')}
						maxlength={80}
						aria-invalid={visibleError('name') ? 'true' : undefined}
						aria-describedby={describedBy('name')}
						onblur={() => markTouched('name')}
						bind:value={editableAddress.name} />
					{#if visibleError('name')}
						<p id="{idPrefix}-name-error" class="text-xs text-destructive">
							{visibleError('name')}
						</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<ScInput
						id="{idPrefix}-line1"
						label="Address line 1"
						{labelClass}
						icon={F.location}
						placeholder="House or flat number, street"
						autocomplete={autofill('address-line1')}
						maxlength={80}
						aria-invalid={visibleError('line1') ? 'true' : undefined}
						aria-describedby={describedBy('line1')}
						onblur={() => markTouched('line1')}
						bind:value={editableAddress.line1} />
					{#if visibleError('line1')}
						<p id="{idPrefix}-line1-error" class="text-xs text-destructive">
							{visibleError('line1')}
						</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<ScInput
						id="{idPrefix}-line2"
						label="Address line 2 (optional)"
						{labelClass}
						placeholder="Area, landmark"
						autocomplete={autofill('address-line2')}
						maxlength={80}
						aria-invalid={visibleError('line2') ? 'true' : undefined}
						aria-describedby={describedBy('line2')}
						onblur={() => markTouched('line2')}
						bind:value={editableAddress.line2} />
					{#if visibleError('line2')}
						<p id="{idPrefix}-line2-error" class="text-xs text-destructive">
							{visibleError('line2')}
						</p>
					{/if}
				</div>

				<AddressLocationFields
					{idPrefix}
					{labelClass}
					{autocompleteSection}
					errors={{
						pincode: visibleError('pincode'),
						city: visibleError('city'),
						state: visibleError('state')
					}}
					onFieldBlur={markTouched}
					bind:pincode={editableAddress.pincode}
					bind:city={editableAddress.city}
					bind:state={editableAddress.state} />

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<ScInput
							id="{idPrefix}-phone"
							type="tel"
							label="Mobile number"
							{labelClass}
							prefix="+91"
							placeholder="10-digit mobile number"
							inputmode="tel"
							autocomplete={autofill('tel-national')}
							maxlength={16}
							aria-invalid={visibleError('phone') ? 'true' : undefined}
							aria-describedby={describedBy('phone')}
							onblur={() => markTouched('phone')}
							bind:value={editableAddress.phone} />
						{#if visibleError('phone')}
							<p id="{idPrefix}-phone-error" class="text-xs text-destructive">
								{visibleError('phone')}
							</p>
						{/if}
					</div>

					{#if !email}
						<div class="space-y-1.5">
							<ScInput
								id="{idPrefix}-email"
								type="email"
								label="Email"
								{labelClass}
								icon={F.mail}
								placeholder="For your receipt"
								autocomplete="email"
								aria-invalid={visibleError('email') ? 'true' : undefined}
								aria-describedby={describedBy('email')}
								onblur={() => markTouched('email')}
								bind:value={editableAddress.email} />
							{#if visibleError('email')}
								<p id="{idPrefix}-email-error" class="text-xs text-destructive">
									{visibleError('email')}
								</p>
							{/if}
						</div>
					{/if}
				</div>

				{#if canCancelEdit}
					<div class="border-t border-border pt-4">
						<ScButton variant="ghost" onclick={cancelEdit}>
							<Icon icon={F.dismiss} class="mr-2 inline size-4" aria-hidden="true" />
							Cancel
						</ScButton>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
