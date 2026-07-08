<script lang="ts">
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import User from '@lucide/svelte/icons/user';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import {
		type Address,
		compareAddress,
		validateAddress,
		newAddress
	} from '$lib/types/product';
	import { ScInput } from '$lib/components/sc';
	import { cn } from '$lib/utils';

	function getWithoutCountryCode(phone: string | undefined) {
		if (!phone) return '';
		if (phone.startsWith('+91')) return phone.substring(3);
		return phone;
	}

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
		onDelete?: any;
		onSave?: any;
		onEditStart?: any;
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
				address = { ...address_old };
				type = 'text';
			} else {
				address = { ...newAddress() };
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
			if (address.phone?.startsWith('+91')) address.phone = address.phone.substring(3);
			return true;
		},
		class: className = ''
	}: Props = $props();

	function toggleType() {
		let k = true;
		if (type == 'edit') k = onSave(!compareAddress(address_old, address), address);
		if (type == 'text') {
			address_old = { ...address };
			k = onEditStart();
		}
		if (k) type = type == 'text' ? 'edit' : 'text';
	}

	let showAddressList = $state(false);
	let addressCount = addresses?.length ?? 0;

	if (!userExists) type = 'edit';
	else if (addresses && addressCount) {
		address = addresses[0];
		type = 'text';
	} else type = 'edit';

	const labelClass = 'text-sm font-medium text-foreground';
</script>

<div class={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
	<div class="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<button
				type="button"
				class="group flex min-w-0 items-center gap-2 text-left focus:outline-none"
				onclick={() => {
					if (userExists && addressCount) {
						showAddressList = !showAddressList;
					}
				}}
			>
				<MapPin class="size-4 shrink-0 text-foreground" aria-hidden="true" />
				<span class="text-sm font-medium text-foreground transition-colors group-hover:text-foreground/80">
					Shipping address
				</span>
				{#if userExists && addressCount}
					<ChevronDown
						class={cn(
							'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
							showAddressList && 'rotate-180'
						)}
						aria-hidden="true"
					/>
				{/if}
			</button>

			{#if addressError}
				<span class="truncate text-sm text-destructive">{addressError}</span>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<button
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				onclick={toggleType}
				aria-label={type === 'text' ? 'Edit address' : 'Save address'}
			>
				{#if type === 'text'}
					<Pencil class="size-4" />
				{:else}
					<Check class="size-4" />
				{/if}
			</button>

			<button
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
				onclick={onDeleteLocal}
				aria-label={type === 'edit' && address.id ? 'Cancel edit' : 'Delete address'}
			>
				{#if type === 'edit' && address.id}
					<X class="size-4" />
				{:else}
					<Trash2 class="size-4" />
				{/if}
			</button>
		</div>
	</div>

	<div class="p-5">
		{#if !showAddressList}
			{#if type === 'text'}
				<div class="space-y-3 text-sm text-foreground">
					<p class="text-base font-medium">{address.name || 'Name'}</p>

					<div class="flex items-start gap-2">
						<MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						<div class="space-y-0.5">
							<p>{address.line1 || 'Address line 1'}</p>
							{#if address.line2}
								<p class="text-muted-foreground">{address.line2}</p>
							{/if}
							<p>
								{address.city || 'City'} – {address.pincode || 'Pincode'}, {address.state || 'State'}
							</p>
						</div>
					</div>

					{#if address.phone}
						<div class="flex items-center gap-2">
							<Phone class="size-4 text-muted-foreground" aria-hidden="true" />
							<span>+91 {getWithoutCountryCode(address.phone)}</span>
						</div>
					{/if}

					{#if address.email && !email}
						<div class="flex items-center gap-2">
							<Mail class="size-4 text-muted-foreground" aria-hidden="true" />
							<span>{address.email}</span>
						</div>
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
					<ScInput
						id="address-name"
						label="Full name"
						{labelClass}
						icon={User}
						placeholder="Enter your full name"
						bind:value={address.name}
					/>

					<ScInput
						id="address-line1"
						label="Address line 1"
						{labelClass}
						icon={MapPin}
						placeholder="Street address"
						bind:value={address.line1}
					/>

					<ScInput
						id="address-line2"
						label="Address line 2"
						{labelClass}
						placeholder="Apartment, suite, unit, etc."
						bind:value={address.line2}
					/>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<ScInput
							id="address-city"
							label="City"
							{labelClass}
							placeholder="City"
							bind:value={address.city}
						/>
						<ScInput
							id="address-pincode"
							label="Pincode"
							{labelClass}
							placeholder="Pincode / ZIP"
							bind:value={address.pincode}
						/>
						<ScInput
							id="address-state"
							label="State"
							{labelClass}
							placeholder="State"
							bind:value={address.state}
						/>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<ScInput
							id="address-phone"
							type="tel"
							label="Phone number"
							{labelClass}
							icon={Phone}
							prefix="+91"
							placeholder="Phone number"
							bind:value={address.phone}
						/>

						{#if !email}
							<ScInput
								id="address-email"
								type="email"
								label="Email"
								{labelClass}
								icon={Mail}
								placeholder="Email address"
								bind:value={address.email}
							/>
						{/if}
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
							address = addrItem;
							showAddressList = false;
							addressValid = true;
							type = 'text';
						}}
					>
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
								<Phone class="size-3.5" aria-hidden="true" />
								+91 {addrItem.phone.startsWith('+91') ? addrItem.phone.substring(3) : addrItem.phone}
							</p>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-2 py-6 text-center text-sm text-destructive">
				<AlertCircle class="size-8" aria-hidden="true" />
				<p>Unknown error occurred. Please refresh the page.</p>
			</div>
		{/if}
	</div>
</div>
