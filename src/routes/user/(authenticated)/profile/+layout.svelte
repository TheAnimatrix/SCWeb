<script lang="ts">
	import { setLoading } from '$lib/client/loading.js';
	import * as Tabs from '$lib/components/ui/tabs';
	import { replaceState, goto } from '$app/navigation';
	import { } from '$lib/client/loading.js';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	export let data;
	let load_store = getContext<Writable<boolean>>('loading');
	async function debug() {
		setLoading(load_store,true);
		console.log("debug:profile");
		let session = await data.supabase_lt.auth.getSession();
		let k = await data.supabase_lt
			.from('users')
			.update({ username: 'Animatrix' })
			.eq('id', session.data.session?.user.id)
			.select();
		setLoading(load_store,false);
	}

	const triggerTabStyle =
		'animate_base data-[state=active]:bg-transparent data-[state=active]:drop-shadow-[0_4px_9px_rgba(255,123,1,0.59)] data-[state=active]:text-white px-4 py-2 text-2xl text-gray-500 rounded-xl hover:bg-scoranged2 text-orange-200 text-opacity-50 text-2xl font-bold max-w-[200px]';

	function getLastRoute(v: string | null) {
		if (!v) return 'Address';
		let x = v.split('/');
		return x[x.length - 1];
	}
</script>

<div class="flex flex-col justify-center">
	<div class="w-full flex flex-col justify-center items-center mb-20">
		<div class="p-2 h-fit w-fit rounded-xl overflow-x-auto bg-transparent flex flex-wrap ">
			<div
				class={triggerTabStyle}
				data-state={getLastRoute($page.route.id) == 'orders' ? 'active' : ''}
			>
				<a href="orders"><span class="max-sm:text-md">Orders</span></a>
			</div>
			<div
				class={triggerTabStyle}
				data-state={getLastRoute($page.route.id) == 'addresses' ? 'active' : ''}
			>
				<a href="addresses"><span class="max-sm:text-md">Address</span></a>
			</div>
			<div
				class={triggerTabStyle}
				data-state={getLastRoute($page.route.id) == 'account' ? 'active' : ''}
			>
				<a href="account"><span class="max-sm:text-md">Account</span></a>
			</div>
			<div
				class={triggerTabStyle}
				data-state={getLastRoute($page.route.id) == 'crafts' ? 'active' : ''}
			>
				<a href="crafts"><span class="max-sm:text-md">Crafts</span></a>
			</div>
		</div>
		<div class="w-[55%] max-sm:w-[95%] max-md:w-[90%] max-lg:w-[85%] max-2xl:w-[75%] flex self-center justify-center items-center">
			<slot />
		</div>
	</div>
	<button class="pt-4 text-white self-center" on:click={debug}>Debug</button>
</div>
