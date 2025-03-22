<script lang="ts">
	import { run } from 'svelte/legacy';

	import { setLoading } from '$lib/client/loading.js';
	import { compareAddress } from '$lib/types/product.js';
	import { } from '$lib/client/loading.js';
	import AddressInput from '$lib/components/fundamental/AddressInput.svelte';
	import { validateAddress, type Address, getValidState } from '$lib/types/product.js';
	import Icon from '@iconify/svelte';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	
	let { data } = $props();
	let errorMsg = $state('');
	let errorShow = $state(false);
	let editing: boolean[] = $state([]);
	let addresses: Address[] = $state([]);
	let load_store = getContext<Writable<boolean>>('loading');

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

	let timeoutId: any = $state();
	function timeout(es: boolean) {
		timeoutId = setTimeout(() => {
			errorShow = false;
		}, 5000);
	}

	run(() => {
		if (errorShow == true) {
			clearTimeout(timeoutId);
			timeout(errorShow);
		}
	});

	async function setup() {
		setLoading(load_store, true);
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
		setLoading(load_store, false);
	}

	async function deleteAddress(i: number) {
		let addr = addresses[i];
		setLoading(load_store, true);
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
		setLoading(load_store, false);
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
			setLoading(load_store, true);
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
				errorMsg = 'Error, could not update address';
				errorShow = true;
			}
		} else {
			//create address
			setLoading(load_store, true);
			result = await data.supabase_lt.from('addresses').insert([{ ...addr }]);
			await setup();
		}
		setLoading(load_store, false);
	}

	addresses = data.addresses;
	editing = data.editing;
</script>

<div class="space-y-6">
	<!-- Add Address Button -->
	<div class="flex justify-between items-center">
		<button
			class="flex items-center gap-2 px-6 py-3 bg-[#151515] hover:bg-opacity-80 rounded-xl transition-all text-accent"
			onclick={newAddress}
		>
			<Icon icon="ph:plus-circle-bold" class="text-xl" />
			<span class="font-medium">Add New Address</span>
		</button>
	</div>

	<!-- Error Message -->
	{#if errorShow}
		<div class="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-xl p-4 text-red-400">
			<div class="flex items-center gap-2">
				<Icon icon="ph:warning-circle-bold" class="text-xl" />
				<span>{errorMsg}</span>
			</div>
		</div>
	{/if}

	<!-- Address List -->
	<div class="grid gap-6">
		{#if addresses.length === 0}
			<div class="bg-[#151515] rounded-xl p-8 text-center">
				<Icon icon="ph:map-pin-bold" class="text-4xl text-gray-400 mx-auto mb-4" />
				<p class="text-gray-400">No addresses added yet</p>
				<button
					class="inline-block mt-4 px-6 py-2 bg-accent bg-opacity-10 text-accent rounded-lg hover:bg-opacity-20 transition-all"
					onclick={newAddress}
				>
					Add Your First Address
				</button>
			</div>
		{:else}
			{#each addresses as address, i}
				<div class="bg-[#151515] rounded-xl overflow-hidden backdrop-blur-md">
					<AddressInput
						type={editing[i] ? 'edit' : 'text'}
						class="p-4"
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
							address.phone = "+91" + address.phone;
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
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	:global(.animate_base) {
		@apply transition-all duration-200;
	}
</style>
