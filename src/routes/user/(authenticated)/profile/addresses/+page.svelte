<script lang="ts">
	import { setLoading } from '$lib/client/loading.js';
	import { compareAddress } from '$lib/types/product.js';
	import { } from '$lib/client/loading.js';
	import AddressInput from '$lib/components/fundamental/AddressInput.svelte';
	import { validateAddress, type Address, getValidState } from '$lib/types/product.js';
	import Icon from '@iconify/svelte';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	export let data;
	let errorMsg = '';
	let errorShow = false;

	let editing: boolean[] = [];
	async function newAddress() {
		if (editError()) return;
		addresses = [{}, ...addresses];
		editing = [true, ...editing];
	}

	function editError() {
		let a = editing.indexOf(true) != -1;
		if (!a) return false;
		errorMsg = 'Please save/cancel any addresses in edit mode before adding a new address';
		errorShow = true;
		return true;
	}

	let timeoutId: any;
	function timeout(es: boolean) {
		timeoutId = setTimeout(() => {
			errorShow = false;
		}, 5000);
	}

	$: if (errorShow == true) {
		clearTimeout(timeoutId);
		timeout(errorShow);
	}

	let addresses: Address[] = [];
	let load_store = getContext<Writable<boolean>>('loading');
	async function setup() {
		setLoading(load_store,true);
		
		let result = await data.supabase_lt.from('addresses').select('*');
		addresses = [];
		if (result && result.data) {
			for (let r of result.data as Address[]) {
				addresses.push(r);
				editing.push(false);
			}
			addresses = [...addresses];
			editing = [...editing];
		}
		setLoading(load_store,false);
	}

	async function deleteAddress(i: number) {
		let addr = addresses[i];
		setLoading(load_store,true);
		if (addr.id) {
			
			let result = await data.supabase_lt.from('addresses').delete().eq('id', addr.id).select();
			if (result.error || !(result.data && result.data.length > 0)) {
				
				errorMsg = 'Error, could not delete address';
				errorShow = true;
			} else {
				await setup();
			}
		} else {
			errorMsg = 'Error, unable to find address to delete in database';
			errorShow = true;
		}
		setLoading(load_store,false);
	}
	async function saveAddress(i: number, isChanged: boolean) {
		let addr = addresses[i];
		let result;
		if (addresses[i].id) {
			//update address
			if (!isChanged) {
				errorMsg = 'No change in address to update';
				errorShow = true;
				return;
			}
			setLoading(load_store,true);
			result = await data.supabase_lt.from('addresses').select('*').eq('id', addr.id);
			if (result.data && result.data[0] && !result.error) {
				if (!compareAddress(result.data[0] as Address, addr)) {
					result = await data.supabase_lt
						.from('addresses')
						.update({ ...addr })
						.eq('id', addr.id)
						.select();
					
					if (result.data && (result.data as []).length > 0) {
						await setup();
					} else {
						errorMsg = 'Error, could not update address';
						errorShow = true;
					}
				} else {
					errorMsg = 'No change in address to update';
					errorShow = true;
					editing[i] = false;
					editing = [...editing];
				}
				errorShow = true;
			} else {
				//show error
				errorMsg = 'Error, could not update address';
				errorShow = true;
			}
		} else {
			//create address
			setLoading(load_store,true);
			result = await data.supabase_lt.from('addresses').insert([{ ...addr }]);
			await setup();
		}
		setLoading(load_store,false);
	}

	addresses = data.addresses;
	editing = data.editing;
</script>

<div class="flex flex-col w-full">
	<button
		class="{addresses.length <= 0
			? 'self-center'
			: 'self-start'} flex p-3 border-[1px] border-orange-300 rounded-xl bg-scoranged2 hover:bg-scoranged1 animate_base"
		on:click={newAddress}
	>
		<span class="text-xl font-medium text-orange-300 pr-2">Add Address</span>
		<Icon icon="iconamoon:sign-plus-circle-duotone" class="text-orange-300 text-3xl" />
	</button>
	<div class:hidden={!errorShow} class="mt-4 text-red-500">{errorMsg}</div>
	{#each addresses as address, i (address)}
		<AddressInput
			type={editing[i] ? 'edit' : 'text'}
			class="animate_base mt-4"
			{address}
			onDelete={(isCloseOnly) => {
				if (isCloseOnly) {
					editing[i] = false;
					return;
				}
				if (!address.id) {
					addresses.splice(i, 1);
					editing.splice(i, 1);
					addresses = addresses;
				} else deleteAddress(i);
			}}
			onSave={(isChanged, saved_addr) => {
				console.log("onSave ",isChanged);
				if (address.state && address.state.length > 0) {
					address.state = getValidState(address.state)[0];
				}
				if(address.phone?.startsWith("+91")) address.phone = address.phone.substring(3);
				let error = validateAddress(address);
				if (error) {
					errorShow = true;
					errorMsg = error;
					return false;
				}
				address.phone = "+91"+address.phone;
				//save address here
				saveAddress(i, isChanged);
				editing[i] = false;
				return true;
			}}
			onEditStart={() => {
				if (editError()) return false;
				editing[i] = true;
				return true;
			}}
		/>
	{/each}
</div>

<style lang="postcss">
</style>
