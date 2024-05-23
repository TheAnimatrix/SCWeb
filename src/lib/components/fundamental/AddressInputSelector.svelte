<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import GlowleftInput from './glowleft_input.svelte';
	import Icon from '@iconify/svelte';
	import {
		getValidState,
		type Address,
		compareAddress,
		validateAddress,

		newAddress

	} from '$lib/types/product';

	function getWithoutCountryCode(phone: string) {
		if (phone?.startsWith('+91')) return phone.substring(3);
		else return phone;
	}

	export let supabase: SupabaseClient<any, 'public', any>;
	export let userExists: boolean = false;
	export let addresses: Address[] | undefined;
	export let type = 'text';
	export let addressValid = false;

	export let address: Address = newAddress();
	export let address_old: Address = newAddress();
	let addressError: string | undefined;

	export let onDelete = (isCloseOnly: boolean) => {
		address = newAddress();
		addressValid = false;
		type="edit";
	};

	let onDeleteLocal = () => {
		if (type == 'text' || !address.id) onDelete(false);
		else {
			type = 'text';
			onDelete(true);
		}
	};

	export let onSave = (isChanged: boolean, addr: Address): boolean => {
		if (addr.phone?.startsWith('+91')) addr.phone = addr.phone.substring(3);
		let result = validateAddress(addr);
		if (result) addressError = result;
		else addressError = undefined;
		if (!result) {
			address.phone = '+91' + addr.phone;
			addressValid = true;
			return true;
		} else return false;
	};

	export let onEditStart = (): boolean => {
		addressValid = false;
		return true;
	};

	let className = '';
	export { className as class };

	function toggleType() {
		console.log('toggle type', type);
		let k = true;
		if (type == 'edit') k = onSave(!compareAddress(address_old, address), address);
		if (type == 'text') {
			address_old = { ...address };
			k = onEditStart();
		}
		if (k) type = type == 'text' ? 'edit' : 'text';
	}

	let hoverAddressTitle = false;
	let addressCount = addresses?.length ?? 0;
	let listAddresses = false;

	//default behavior
	if (!userExists) type = 'edit';
	else {
		if (addresses && addressCount) {
			address = addresses[0];
			type = 'text';
		} else type = 'edit';
	}
</script>

<div class="flex flex-col border-[1px] border-scblue bg-scblued1 rounded-xl">
	<div class="flex justify-between ml-8 mt-4 mr-4">
		<button
			on:mouseenter={() => {
				hoverAddressTitle = true;
			}}
			on:mouseleave={() => {
				hoverAddressTitle = false;
			}}
			on:click={() => {
				if (userExists && addressCount) {
					//load addresses
					listAddresses = !listAddresses;
				}
			}}
			class="text-scbluel1 text-lg w-fit font-semibold flex flex-col -mt-4">
			<hr
				class="border-scblue w-full mb-2 border-[1px] rounded-xl animate_base {hoverAddressTitle
					? '[box-shadow:0px_9px_34px_6px_hsla(206.33,_100%,_73.14%,_0.61)]'
					: '[box-shadow:0px_9px_34px_6px_hsla(206.33,_100%,_73.14%,_0.31)]'}" />
			<div class="flex w-fit items-center">
				Delivery Address
				{#if userExists && addressCount}
					{#if listAddresses}
						<Icon icon="iconamoon:arrow-up-2-bold" class="w-6 h-6 ml-1" />
					{:else}
						<Icon icon="iconamoon:arrow-down-2-bold" class="w-6 h-6 ml-1" />
					{/if}
				{/if}
			</div>
			<div class="text-red-500 font-normal text-sm {addressError ? 'visible' : 'hidden'}">
				{addressError}
			</div>
		</button>
		<div class="flex">
			<button on:click={toggleType}>
				<Icon
					icon={type == 'text' ? 'iconamoon:edit-duotone' : 'iconamoon:check-square-duotone'}
					class="text-blue-300 text-2xl mr-2" />
			</button>
			<button on:click={onDeleteLocal}>
				<Icon
					icon="iconamoon:trash-simple-duotone"
					class="text-blue-300 text-2xl mr-2 {type == 'edit' && address.id
						? 'hidden'
						: 'visible'}" />
				<Icon
					icon="iconamoon:close-circle-1-duotone"
					class="text-blue-300 text-2xl mr-2 {type == 'text' || !address.id
						? 'hidden'
						: 'visible'}" />
			</button>
		</div>
	</div>
	<div
		class="flex flex-col w-full self-start text-blue-200 opacity-80 font-medium text-lg animate_base mt-2 mb-6">
		{#if listAddresses == false}
			{#if type == 'text'}
				<div class="px-8">
					<div class="text-scbluel2 font-semibold">{address.name ?? 'Name'}</div>
					<div>{address.line1 ?? 'Line 1 Address'}</div>
					<div>{address.line2 ?? 'Line 2 Address'}</div>
					<div>
						{address.city ?? 'City'}-{address.pincode ?? 'Pincode'}, {address.state ?? 'State'}
					</div>
					{#if address.phone}
						<div>
							Ph: {`${address.phone.substring(0, 3)}-${address.phone.substring(3)}` ?? 'Phone'}
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex flex-wrap flex-col space-y-2 px-8">
					<GlowleftInput
						f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
						f21="bg-scblued3"
						f22="bg-scblued2"
						gradient="bg-blue-300 bg-opacity-80"
						inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
						bind:value={address.name}
						placeholder={address.name ?? 'Name'} />
					<GlowleftInput
						f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
						f21="bg-scblued3"
						f22="bg-scblued2"
						gradient="bg-blue-300 bg-opacity-80"
						inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
						bind:value={address.line1}
						placeholder={address.line1 ?? 'Line 1 Address'} />
					<GlowleftInput
						f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
						f21="bg-scblued3"
						f22="bg-scblued2"
						gradient="bg-blue-300 bg-opacity-80"
						inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
						bind:value={address.line2}
						placeholder={address.line2 ?? 'Line 2 Address'} />
					<div class="flex flex-wrap w-full gap-x-2 gap-y-2">
						<GlowleftInput
							f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
							f21="bg-scblued3"
							f22="bg-scblued2"
							class="flex-1 min-w-32"
							gradient="bg-blue-300 bg-opacity-80"
							inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
							bind:value={address.city}
							placeholder={address.city ?? 'City'} />
						<GlowleftInput
							f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
							f21="bg-scblued3"
							f22="bg-scblued2"
							class="flex-1 min-w-32"
							gradient="bg-blue-300 bg-opacity-80"
							inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
							bind:value={address.pincode}
							placeholder={address.pincode ?? 'Pincode'} />
						<GlowleftInput
							f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
							f21="bg-scblued3"
							f22="bg-scblued2"
							class="flex-1 min-w-32"
							gradient="bg-blue-300 bg-opacity-80"
							inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
							bind:value={address.state}
							placeholder={address.state ?? 'State'} />
					</div>
					<GlowleftInput
						f11="[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]"
						f21="bg-scblued3"
						f22="bg-scblued2"
						class="flex-1 min-w-32"
						gradient="bg-blue-300 bg-opacity-80"
						inputClass="text-start !text-blue-200 !text-lg !px-2 !placeholder-blue-200 !placeholder-opacity-30"
						bind:value={address.phone}
						placeholder={getWithoutCountryCode(address.phone) ?? 'Phone'} />
				</div>
			{/if}
		{:else if addresses}
			{#each addresses as addritem, i}
				<hr class="w-full border-scblue border-opacity-30">
				<button
					class="flex flex-col hover:bg-scblued2 px-8 py-1 text-start w-full"
					on:click={() => {
						address = addritem;
						listAddresses = false;
						addressValid = true;
						type="text";
					}}>
					<div class="text-scbluel2 font-semibold">{addritem.name}</div>
					<div>{addritem.line1}</div>
					<div>{addritem.line2}</div>
					<div>{addritem.city}-{addritem.pincode}, {addritem.state}</div>
					<div>Ph: {addritem.phone.substring(0, 3)}-{addritem.phone.substring(3)}</div>
				</button>
				{#if i==addresses.length-1}
					<hr class="w-[calc(100%)+20px] border-scblue border-opacity-30 -mr-1">
				{/if}
			{/each}
		{:else}
			<div>Unknown error occured, Please refresh</div>
		{/if}
	</div>
</div>
