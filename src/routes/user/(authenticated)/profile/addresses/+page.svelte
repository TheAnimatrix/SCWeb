<script lang="ts">
	import { compareAddress } from '$lib/stores/types/product';
	import { loading } from '$lib/stores/loading';
	import AddressInput from '$lib/components/fundamental/AddressInput.svelte';
	import { validateAddress, type Address, getValidState } from '$lib/stores/types/product';
	import Icon from '@iconify/svelte';
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
	async function setup() {
		loading.set(true);
		console.log("setup:address");
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
		loading.set(false);
	}

	async function deleteAddress(i: number) {
		let addr = addresses[i];
		loading.set(true);
		if (addr.id) {
			console.log(addr.id);
			let result = await data.supabase_lt.from('addresses').delete().eq('id', addr.id).select();
			if (result.error || !(result.data && result.data.length > 0)) {
				console.log(result);
				errorMsg = 'Error, could not delete address';
				errorShow = true;
			} else {
				await setup();
			}
		} else {
			errorMsg = 'Error, unable to find address to delete in database';
			errorShow = true;
		}

		loading.set(false);
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
			loading.set(true);
			result = await data.supabase_lt.from('addresses').select('*').eq('id', addr.id);
			if (result.data && result.data[0] && !result.error) {
				if (!compareAddress(result.data[0] as Address, addr)) {
					result = await data.supabase_lt
						.from('addresses')
						.update({ ...addr })
						.eq('id', addr.id)
						.select();
					console.log(result);
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
			loading.set(true);
			result = await data.supabase_lt.from('addresses').insert([{ ...addr }]);
			await setup();
		}
		loading.set(false);
	}

	setup();
</script>

<div class="flex flex-col">
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
