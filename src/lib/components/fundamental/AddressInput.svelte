<script lang="ts">
	import { type Address, compareAddress, getValidState } from '$lib/types/product';
	import { Button } from '$lib/components/ui/button';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';

	interface Props {
		address: Address;
		isEditing: boolean;
		class?: string;
		onEdit?: () => boolean;
		onSave?: (addr: Address, isChanged: boolean) => Promise<boolean> | boolean;
		onDelete?: () => void;
		onCancel?: () => void;
	}

	let {
		address,
		isEditing = $bindable(false),
		class: className = '',
		onEdit = () => true,
		onSave = async () => true,
		onDelete = () => {},
		onCancel = () => {}
	}: Props = $props();

	let editableAddress = $state<Address>({});
	let originalAddress = $state<Address>({});

	function getWithoutCountryCode(phone: string | undefined): string {
		if (!phone) return '';
		if (phone.startsWith('+91')) return phone.substring(3);
		if (phone.startsWith('91') && phone.length > 10) return phone.substring(2);
		return phone;
	}

	$effect(() => {
		if (isEditing) {
			if (address.id !== originalAddress.id || !compareAddress(address, originalAddress)) {
				originalAddress = { ...address };
				editableAddress = { ...address };
				if (editableAddress.phone) {
					editableAddress.phone = getWithoutCountryCode(editableAddress.phone);
				}
			}
		}
	});

	function handleEditRequest() {
		if (onEdit()) isEditing = true;
	}

	async function handleSaveRequest() {
		let addressToSave = { ...editableAddress };

		if (addressToSave.state?.length) {
			const [validState] = getValidState(addressToSave.state);
			addressToSave.state = validState || addressToSave.state;
		}

		if (addressToSave.phone) {
			const phoneNum = getWithoutCountryCode(addressToSave.phone.trim());
			addressToSave.phone = phoneNum ? '+91' + phoneNum : undefined;
		} else {
			addressToSave.phone = undefined;
		}

		const isChanged = !compareAddress(originalAddress, addressToSave);
		if (await onSave(addressToSave, isChanged)) {
			isEditing = false;
		}
	}

	const uniqueId = `addr-${address.id || Math.random().toString(36).substring(2, 9)}`;

	const inputClass =
		'h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10';

	const labelClass = 'font-mono text-xs text-muted-foreground';
</script>

<div class="{className} rounded-md border border-border bg-card">
	<div class="flex items-start justify-between gap-3 p-3">
		{#if !isEditing}
			<div class="min-w-0 flex-1 space-y-1.5">
				<div class="text-sm font-medium">{address.name || 'Unnamed'}</div>
				<div class="flex items-start gap-2 text-sm text-muted-foreground">
					<MapPin class="mt-0.5 size-3.5 shrink-0" />
					<div>
						<div>{address.line1}</div>
						{#if address.line2}<div>{address.line2}</div>{/if}
						<div>{address.city} – {address.pincode}, {address.state}</div>
					</div>
				</div>
				{#if address.phone}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<Phone class="size-3.5 shrink-0" />
						<span>+91 {getWithoutCountryCode(address.phone)}</span>
					</div>
				{/if}
			</div>
		{:else}
			<div class="min-w-0 flex-1 space-y-3">
				<div>
					<label for="{uniqueId}-name" class={labelClass}>name</label>
					<input
						id="{uniqueId}-name"
						type="text"
						class="{inputClass} mt-1"
						placeholder="Full name"
						bind:value={editableAddress.name}
					/>
				</div>

				<div>
					<label for="{uniqueId}-line1" class={labelClass}>address</label>
					<input
						id="{uniqueId}-line1"
						type="text"
						class="{inputClass} mt-1"
						placeholder="House no, street, area"
						bind:value={editableAddress.line1}
					/>
				</div>

				<div>
					<label for="{uniqueId}-line2" class={labelClass}>line 2 <span class="normal-case">(optional)</span></label>
					<input
						id="{uniqueId}-line2"
						type="text"
						class="{inputClass} mt-1"
						placeholder="Landmark, apt, suite"
						bind:value={editableAddress.line2}
					/>
				</div>

				<div class="grid grid-cols-3 gap-2">
					<div>
						<label for="{uniqueId}-city" class={labelClass}>city</label>
						<input id="{uniqueId}-city" type="text" class="{inputClass} mt-1" bind:value={editableAddress.city} />
					</div>
					<div>
						<label for="{uniqueId}-pincode" class={labelClass}>pincode</label>
						<input
							id="{uniqueId}-pincode"
							type="text"
							class="{inputClass} mt-1"
							bind:value={editableAddress.pincode}
							maxlength="6"
							inputmode="numeric"
						/>
					</div>
					<div>
						<label for="{uniqueId}-state" class={labelClass}>state</label>
						<input id="{uniqueId}-state" type="text" class="{inputClass} mt-1" bind:value={editableAddress.state} />
					</div>
				</div>

				<div>
					<label for="{uniqueId}-phone" class={labelClass}>phone</label>
					<div class="relative mt-1">
						<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+91</span>
						<input
							id="{uniqueId}-phone"
							type="tel"
							class="{inputClass} pl-10"
							placeholder="10-digit number"
							bind:value={editableAddress.phone}
							maxlength="14"
							inputmode="tel"
						/>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex shrink-0 gap-1">
			{#if !isEditing}
				<Button variant="ghost" size="icon" class="size-8" onclick={handleEditRequest} aria-label="Edit">
					<Pencil class="size-3.5" />
				</Button>
			{:else}
				<Button variant="ghost" size="icon" class="size-8" onclick={handleSaveRequest} aria-label="Save">
					<Check class="size-3.5" />
				</Button>
			{/if}
			<Button
				variant="ghost"
				size="icon"
				class="size-8 text-destructive hover:text-destructive"
				onclick={isEditing ? () => { onCancel(); isEditing = false; } : () => onDelete()}
				aria-label={isEditing ? 'Cancel' : 'Delete'}
			>
				{#if isEditing}
					<X class="size-3.5" />
				{:else}
					<Trash2 class="size-3.5" />
				{/if}
			</Button>
		</div>
	</div>
</div>

<style>
	input {
		min-width: 0;
	}
</style>
