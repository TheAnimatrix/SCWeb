<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { type Address, compareAddress, validateAddress, newAddress, normalizeAddress } from '$lib/types/product';
	import { ScButton, ScInput } from '$lib/components/sc';
	import AddressLocationFields from '$lib/components/fundamental/AddressLocationFields.svelte';
	import { cn } from '$lib/utils';

	function getWithoutCountryCode(phone: string | undefined) {
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
			phone: getWithoutCountryCode(normalized.phone),
			email: normalized.email ?? ''
		};
	}

	let editableAddress = $state(toEditableFields(newAddress()));

	let addressError: string | undefined = $state();

	let onDeleteLocal = () => {
		if (type == 'text' || !address.id) onDelete(false);
		else {
			type = 'text';
			onDelete(true);
		}
	};

	interface Props {
		email: string | undefined;
		userExists?: boolean;
		addresses: Address[] | undefined;
		type?: string;
		addressValid?: boolean;
		address?: Address;
		address_old?: Address;
		onDelete?: (isCloseOnly: boolean) => void;
		onSave?: (isChanged: boolean, addr: Address) => boolean;
		onEditStart?: () => boolean;
		title?: string;
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
		onDelete = (isCloseOnly: boolean) => {
			if (isCloseOnly) {
				address = normalizeAddress(address_old);
				editableAddress = toEditableFields(address);
				type = 'text';
			} else {
				address = newAddress();
				editableAddress = toEditableFields(address);
				addressValid = false;
				type = 'edit';
			}
		},
		onSave = (isChanged: boolean, addr: Address): boolean => {
			if (addr.phone?.startsWith('+91')) addr.phone = addr.phone.substring(3);
			const result = validateAddress(addr, !userExists);
			if (result) addressError = result;
			else addressError = undefined;
			if (!result) {
				address.phone = '+91' + (addr.phone || '');
				address = { ...address };
				addressValid = true;
				return true;
			}
			return false;
		},
		onEditStart = (): boolean => {
			addressValid = false;
			editableAddress = toEditableFields(address);
			return true;
		},
		title = 'Shipping address',
		class: className = ''
	}: Props = $props();

	function syncEditableToAddress() {
		address = {
			...address,
			...editableAddress
		};
	}

	function toggleType() {
		let k = true;
		if (type == 'edit') {
			syncEditableToAddress();
			k = onSave(!compareAddress(address_old, address), address);
		}
		if (type == 'text') {
			address_old = { ...address };
			k = onEditStart();
		}
		if (k) type = type == 'text' ? 'edit' : 'text';
	}

	let showAddressList = $state(false);
	let addressCount = addresses?.length ?? 0;

	if (!userExists) {
		type = 'edit';
		address = normalizeAddress(address);
		editableAddress = toEditableFields(address);
	} else if (addresses && addressCount) {
		address = normalizeAddress(addresses[0]);
		type = 'text';
	} else {
		type = 'edit';
		editableAddress = toEditableFields(address);
	}

	const labelClass = 'text-sm font-medium text-foreground';
</script>

<div
	class={cn(
		'overflow-hidden md:rounded-lg md:border md:border-border md:bg-card',
		className
	)}>
	<div class="flex items-center gap-3 border-b border-border py-4 md:px-5">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<button
				type="button"
				class="group flex min-w-0 items-center gap-2 text-left focus:outline-none"
				onclick={() => {
					if (userExists && addressCount) {
						showAddressList = !showAddressList;
					}
				}}>
				<Icon icon={F.location} class="size-4 shrink-0 text-foreground" aria-hidden="true" />
				<span
					class="text-sm font-medium text-foreground transition-colors group-hover:text-foreground/80">
					{title}
				</span>
				{#if userExists && addressCount}
					<Icon icon={F.chevronDown} class={cn(
							'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
							showAddressList && 'rotate-180'
						)}
						aria-hidden="true" />
				{/if}
			</button>

			{#if addressError}
				<span class="truncate text-sm text-destructive">{addressError}</span>
			{/if}
		</div>

	</div>

	<div class="py-5 md:p-5">
		{#if !showAddressList}
			{#if type === 'text'}
				<div class="space-y-3 text-sm text-foreground">
					<p class="text-base font-medium">{address.name || 'Name'}</p>

					<div class="flex items-start gap-2">
						<Icon icon={F.location} class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						<div class="space-y-0.5">
							<p>{address.line1 || 'Address line 1'}</p>
							{#if address.line2}
								<p class="text-muted-foreground">{address.line2}</p>
							{/if}
							<p>
								{address.city || 'City'} – {address.pincode || 'Pincode'}, {address.state ||
									'State'}
							</p>
						</div>
					</div>

					{#if address.phone}
						<div class="flex items-center gap-2">
							<Icon icon={F.phone} class="size-4 text-muted-foreground" aria-hidden="true" />
							<span>+91 {getWithoutCountryCode(address.phone)}</span>
						</div>
					{/if}

					{#if address.email && !email}
						<div class="flex items-center gap-2">
							<Icon icon={F.mail} class="size-4 text-muted-foreground" aria-hidden="true" />
							<span>{address.email}</span>
						</div>
					{/if}

					<div
						class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
						<ScButton
							variant="secondary"
							class="text-destructive hover:bg-destructive/10 hover:text-destructive"
							onclick={onDeleteLocal}>
							<Icon icon={F.delete} class="mr-2 inline size-4" aria-hidden="true" />
							Delete address
						</ScButton>
						<ScButton onclick={toggleType}>
							<Icon icon={F.edit} class="mr-2 inline size-4" aria-hidden="true" />
							Edit address
						</ScButton>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<ScInput
						id="address-name"
						label="Full name"
						{labelClass}
						icon={F.person}
						placeholder="Enter your full name"
						bind:value={editableAddress.name} />

					<ScInput
						id="address-line1"
						label="Address line 1"
						{labelClass}
						icon={F.location}
						placeholder="Street address"
						bind:value={editableAddress.line1} />

					<ScInput
						id="address-line2"
						label="Address line 2"
						{labelClass}
						placeholder="Apartment, suite, unit, etc."
						bind:value={editableAddress.line2} />

					<AddressLocationFields
						idPrefix="address"
						{labelClass}
						bind:pincode={editableAddress.pincode}
						bind:city={editableAddress.city}
						bind:state={editableAddress.state} />

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<ScInput
							id="address-phone"
							type="tel"
							label="Phone number"
							{labelClass}
							icon={F.phone}
							prefix="+91"
							placeholder="Phone number"
							bind:value={editableAddress.phone} />

						{#if !email}
							<ScInput
								id="address-email"
								type="email"
								label="Email"
								{labelClass}
								icon={F.mail}
								placeholder="Email address"
								bind:value={editableAddress.email} />
						{/if}
					</div>

					<div
						class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
						<ScButton
							variant="secondary"
							class={address.id
								? ''
								: 'text-destructive hover:bg-destructive/10 hover:text-destructive'}
							onclick={onDeleteLocal}>
							{#if address.id}
								<Icon icon={F.dismiss} class="mr-2 inline size-4" aria-hidden="true" />
								Cancel
							{:else}
								<Icon icon={F.delete} class="mr-2 inline size-4" aria-hidden="true" />
								Clear form
							{/if}
						</ScButton>
						<ScButton onclick={toggleType}>
							<Icon icon={F.check} class="mr-2 inline size-4" aria-hidden="true" />
							Save address
						</ScButton>
					</div>
				</div>
			{/if}
		{:else if addresses && addresses.length > 0}
			<div class="max-h-80 space-y-2 overflow-y-auto pr-1">
				{#each addresses as addrItem (addrItem.id ?? addrItem.line1)}
					<button
						type="button"
						class="flex w-full flex-col rounded-md border border-border p-4 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-muted/40"
						onclick={() => {
							address = normalizeAddress(addrItem);
							showAddressList = false;
							addressValid = true;
							type = 'text';
						}}>
						<p class="font-medium text-foreground">{addrItem.name || ''}</p>
						<p class="mt-1 text-muted-foreground">{addrItem.line1 || ''}</p>
						{#if addrItem.line2}
							<p class="text-muted-foreground">{addrItem.line2}</p>
						{/if}
						<p class="text-muted-foreground">
							{addrItem.city || ''} – {addrItem.pincode || ''}, {addrItem.state || ''}
						</p>
						{#if addrItem.phone}
							<p class="mt-2 flex items-center gap-1.5 text-muted-foreground">
								<Icon icon={F.phone} class="size-3.5" aria-hidden="true" />
								+91 {addrItem.phone.startsWith('+91')
									? addrItem.phone.substring(3)
									: addrItem.phone}
							</p>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-2 py-6 text-center text-sm text-destructive">
				<Icon icon={F.errorCircle} class="size-8" aria-hidden="true" />
				<p>Unknown error occurred. Please refresh the page.</p>
			</div>
		{/if}
	</div>
</div>
