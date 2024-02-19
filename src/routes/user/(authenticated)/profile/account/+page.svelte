<script lang="ts">
	import { goto } from '$app/navigation';
	import { validatePassword } from '$lib/stores/types/helper';
	import GlowleftInput from '$lib/components/fundamental/glowleft_input.svelte';
	import { loading } from '$lib/stores/loading';
	import type { SupabaseClient } from '@supabase/supabase-js';

	export let data;
	let supabase_lt = data.supabase_lt;

	let username: string | undefined = '',
		email: string | undefined = '',
		picture: string | undefined = '',
		tier: string | undefined = '';

	let oldPass: string, newPass: string, confirmPass: string;

	async function setup() {
		loading.set(true);
		let userResponse = await supabase_lt.auth.getUser();
		if (userResponse?.data.user) {
			let user = userResponse.data.user;
			email = user.email;
			let id = user.id;
			let usermore = await supabase_lt.from('users').select().eq('id', user.id);
			if (usermore && usermore.data && usermore.data[0]) {
				username = usermore.data[0].username;
				tier = usermore.data[0].tier ? usermore.data[0].tier : 'Bee';
			}
		}
		loading.set(false);
	}

	let p1: HTMLInputElement, p2: HTMLInputElement;
	let error_msg: string | undefined;
	async function changePassword() {
		let k = validatePassword(newPass, confirmPass);
		if (k.error) {
			error_msg = k.msg;
			return;
		} else error_msg = undefined;
		loading.set(true);
		supabase_lt.auth.updateUser({password:newPass});
		p1.value = '';
		p2.value = '';
		loading.set(false);
		alert('Password changed successfully');
	}

	async function logout() {
		const d = await supabase_lt.auth.signOut({ scope: 'global' });
	}

	setup();
</script>

<div class="mt-4 flex flex-col w-full h-fit justify-center items-center">
	<div class="flex max-sm:flex-col justify-between gap-x-10">
		<div class="flex flex-col flex-1 text-orange-200 text-xl font-bold mr-8 max-sm:order-2">
			<div>Username</div>
			<div class="highlight"><span class="font-light">/crafts/</span>{username}</div>
			<div>E-mail</div>
			<div class="highlight">{email}</div>
			<div>Tier</div>
			<div class="highlight">{tier}</div>
		</div>
		<div class="flex flex-col flex-1 text-orange-200 text-xl font-bold items-stretch max-sm:order-1">
			<div>Picture</div>
			<img
				src="/images/crane.png"
				class="bg-scoranged1 mt-2 aspect-square object-contain mb-8 rounded-xl border-solid border-[1px] border-orange-200 w-[250px] h-[250px]"
				alt=""
			/>
		</div>
	</div>
	<div class="mt-4 flex flex-col w-full items-center">
		<div class="text-2xl text-orange-200 font-bold text-center">Security</div>
		<div class="w-[50%] text-xl text-red-500 text-center text-wrap {error_msg == undefined ? 'hidden' : 'visible'}">
			{error_msg}
		</div>
		<GlowleftInput
			gradient="bg-orange-300"
			class="mt-3 mx-auto"
			bind:value={newPass}
			placeholder="New Password"
			bind:inputElement={p1}
		/>
		<GlowleftInput
			gradient="bg-orange-300"
			class="mt-3 mx-auto"
			bind:value={confirmPass}
			placeholder="Confirm Password"
			bind:inputElement={p2}
		/>
		<button class="button animate_base" on:click={changePassword}>Change password</button>
		<button class="button mt-16" on:click={logout}>Logout</button>
	</div>
</div>

<style lang="postcss">
	.highlight {
		@apply font-normal mt-2 mb-4 p-4 border-solid border-orange-200 border-[1px] rounded-xl bg-[#362515] w-fit;
	}
	.button {
		@apply mx-auto mt-4 bg-scoranged2 rounded-xl w-fit p-4 text-orange-200 font-bold hover:bg-orange-300 hover:text-scoranged1;
	}
</style>
