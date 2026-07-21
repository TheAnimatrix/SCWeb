<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { type Address, compareAddress, getValidState } from '$lib/types/product';
	import { Button } from '$lib/components/ui/button';
	import { ScInput } from '$lib/components/sc';
	import AddressLocationFields from '$lib/components/fundamental/AddressLocationFields.svelte';
						
	interface Props {
		address: Address;
		isEditing?: boolean;
		class?: string;
		onEdit?: () => boolean;
		onSave?: (addr: Address, isChanged: boolean) => Promise<boolean> | boolean;
		onDelete?: () => void;
		onCancel?: () => void;
	}

	let {
		address,
		isEditing = false,
		class: className = '',
		onEdit = () => true,
		onSave = async () => true,
		onDelete = () => {},
		onCancel = () => {}
	}: Props = $props();

	let editableAddress = $state({
		name: '',
		line1: '',
		line2: '',
		city: '',
		pincode: '',
		state: '',
		phone: ''
	});
	let originalAddress = $state<Address>({});

	function getWithoutCountryCode(phone: string | undefined): string {
		if (!phone) return '';
		if (phone.startsWith('+91')) return phone.substring(3);
		if (phone.startsWith('91') && phone.length > 10) return phone.substring(2);
		return phone;
	}

	function toEditableFields(addr: Address) {
		return {
			name: addr.name ?? '',
			line1: addr.line1 ?? '',
			line2: addr.line2 ?? '',
			city: addr.city ?? '',
			pincode: addr.pincode ?? '',
			state: addr.state ?? '',
			phone: addr.phone ? getWithoutCountryCode(addr.phone) : ''
		};
	}

	$effect(() => {
		if (isEditing) {
			if (address.id !== originalAddress.id || !compareAddress(address, originalAddress)) {
				originalAddress = { ...address };
				editableAddress = toEditableFields(address);
			}
		}
	});

	function handleEditRequest() {
		onEdit();
	}

	async function handleSaveRequest() {
		let addressToSave: Address = {
			...address,
			...editableAddress,
			line2: editableAddress.line2 || undefined
		};

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
		await onSave(addressToSave, isChanged);
	}

	const uniqueId = `addr-${address.id || Math.random().toString(36).substring(2, 9)}`;

	const labelClass = 'font-mono text-xs text-muted-foreground';
</script>

<div class="{className} rounded-md border border-border bg-card">
	<div class="flex items-start justify-between gap-3 p-3">
		{#if !isEditing}
			<div class="min-w-0 flex-1 space-y-1.5">
				<div class="text-sm font-medium">{address.name || 'Unnamed'}</div>
				<div class="flex items-start gap-2 text-sm text-muted-foreground">
					<Icon icon={F.location} class="mt-0.5 size-3.5 shrink-0" />
					<div>
						<div>{address.line1}</div>
						{#if address.line2}<div>{address.line2}</div>{/if}
						<div>{address.city} – {address.pincode}, {address.state}</div>
					</div>
				</div>
				{#if address.phone}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon icon={F.phone} class="size-3.5 shrink-0" />
						<span>+91 {getWithoutCountryCode(address.phone)}</span>
					</div>
				{/if}
			</div>
		{:else}
			<div class="min-w-0 flex-1 space-y-3">
				<div>
					<label for="{uniqueId}-name" class={labelClass}>name</label>
					<ScInput
						id="{uniqueId}-name"
						type="text"
						size="sm"
						wrapperClass="mt-1"
						placeholder="Full name"
						bind:value={editableAddress.name} />
				</div>

				<div>
					<label for="{uniqueId}-line1" class={labelClass}>address</label>
					<ScInput
						id="{uniqueId}-line1"
						type="text"
						size="sm"
						wrapperClass="mt-1"
						placeholder="House no, street, area"
						bind:value={editableAddress.line1} />
				</div>

				<div>
					<label for="{uniqueId}-line2" class={labelClass}>
						line 2 <span class="normal-case">(optional)</span>
					</label>
					<ScInput
						id="{uniqueId}-line2"
						type="text"
						size="sm"
						wrapperClass="mt-1"
						placeholder="Landmark, apt, suite"
						bind:value={editableAddress.line2} />
				</div>

				<AddressLocationFields
					idPrefix={uniqueId}
					{labelClass}
					size="sm"
					bind:pincode={editableAddress.pincode}
					bind:city={editableAddress.city}
					bind:state={editableAddress.state} />

				<div>
					<label for="{uniqueId}-phone" class={labelClass}>phone</label>
					<ScInput
						id="{uniqueId}-phone"
						type="tel"
						size="sm"
						wrapperClass="mt-1"
						prefix="+91"
						placeholder="10-digit number"
						bind:value={editableAddress.phone}
						maxlength={14}
						inputmode="tel" />
				</div>
			</div>
		{/if}

		<div class="flex shrink-0 gap-1">
			{#if !isEditing}
				<Button
					variant="ghost"
					size="icon"
					class="size-8"
					onclick={handleEditRequest}
					aria-label="Edit">
					<Icon icon={F.edit} class="size-3.5" />
				</Button>
			{:else}
				<Button
					variant="ghost"
					size="icon"
					class="size-8"
					onclick={handleSaveRequest}
					aria-label="Save">
					<Icon icon={F.check} class="size-3.5" />
				</Button>
			{/if}
			<Button
				variant="ghost"
				size="icon"
				class="size-8 text-destructive hover:text-destructive"
				onclick={isEditing ? () => onCancel() : () => onDelete()}
				aria-label={isEditing ? 'Cancel' : 'Delete'}>
				{#if isEditing}
					<Icon icon={F.dismiss} class="size-3.5" />
				{:else}
					<Icon icon={F.delete} class="size-3.5" />
				{/if}
			</Button>
		</div>
	</div>
</div>

<style>
	:global(.min-w-0 input) {
		min-width: 0;
	}
</style>
