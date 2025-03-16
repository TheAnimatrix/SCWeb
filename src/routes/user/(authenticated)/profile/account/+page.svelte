<script lang="ts">
	import { goto } from '$app/navigation';
	import { validatePassword } from '$lib/types/helper.js';
	import { setLoading } from '$lib/client/loading.js';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import Icon from '@iconify/svelte';

	export let data;
	let supabase_lt = data.supabase_lt;

	let username: string | undefined = '',
		email: string | undefined = '',
		picture: string | undefined = '',
		tier: string | undefined = '';

	username = data.username;
	email = data.email;
	tier = data.tier;

	let newPass: string = '', confirmPass: string = '';
	let load_store = getContext<Writable<boolean>>('loading');
	let error_msg: string | undefined;
	let isUpdatingPassword = false;

	async function changePassword() {
		if (isUpdatingPassword) return;
		isUpdatingPassword = true;
		
		let k = validatePassword(newPass, confirmPass);
		if (k.error) {
			error_msg = k.msg;
			isUpdatingPassword = false;
			return;
		} else error_msg = undefined;
		
		setLoading(load_store, true);
		try {
			await supabase_lt.auth.updateUser({ password: newPass });
			newPass = '';
			confirmPass = '';
			alert('Password changed successfully');
		} catch (err) {
			error_msg = 'Failed to update password. Please try again.';
		} finally {
			setLoading(load_store, false);
			isUpdatingPassword = false;
		}
	}

	async function logout() {
		await supabase_lt.auth.signOut({ scope: 'global' });
	}
</script>

<div class="bg-[#151515]/40 backdrop-blur-sm rounded-2xl border border-[#252525] overflow-hidden">
	<!-- Profile Info Section -->
	<div class="p-6 border-b border-[#252525]">
		<h2 class="text-2xl font-bold flex items-center gap-3 mb-6">
			<Icon icon="ph:user-circle-bold" class="text-[#c2ff00] opacity-80" />
			Profile Information
		</h2>
		
		<div class="grid md:grid-cols-2 gap-8">
			<!-- User Details -->
			<div class="space-y-4">
				<div>
					<label class="text-sm text-gray-400">Username</label>
					<div class="mt-1 p-3 bg-[#0c0c0c]/60 rounded-xl border border-[#252525]">
						<span class="text-gray-500">/crafts/</span>{username}
					</div>
				</div>
				
				<div>
					<label class="text-sm text-gray-400">Email</label>
					<div class="mt-1 p-3 bg-[#0c0c0c]/60 rounded-xl border border-[#252525]">
						{email}
					</div>
				</div>
				
				<div>
					<label class="text-sm text-gray-400">Tier</label>
					<div class="mt-1 p-3 bg-[#0c0c0c]/60 rounded-xl border border-[#252525] flex items-center gap-2">
						<Icon icon="ph:star-bold" class="text-[#c2ff00]" />
						{tier}
					</div>
				</div>
			</div>

			<!-- Profile Picture -->
			<div class="flex flex-col items-center justify-center">
				<img
					src="/images/crane.png"
					class="w-48 h-48 object-cover rounded-xl border border-[#252525] bg-[#0c0c0c]/60"
					alt="Profile picture"
				/>
			</div>
		</div>
	</div>

	<!-- Security Section -->
	<div class="p-6">
		<h2 class="text-2xl font-bold flex items-center gap-3 mb-6">
			<Icon icon="ph:shield-check-bold" class="text-[#c2ff00] opacity-80" />
			Security Settings
		</h2>

		{#if error_msg}
			<div class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
				{error_msg}
			</div>
		{/if}

		<div class="space-y-4 max-w-md">
			<div>
				<label class="text-sm text-gray-400">New Password</label>
				<input
					type="password"
					bind:value={newPass}
					placeholder="Enter new password"
					class="mt-1 w-full p-3 bg-[#0c0c0c]/60 rounded-xl border border-[#252525] focus:outline-none focus:ring-1 focus:ring-[#c2ff00]/50"
				/>
			</div>

			<div>
				<label class="text-sm text-gray-400">Confirm Password</label>
				<input
					type="password"
					bind:value={confirmPass}
					placeholder="Confirm new password"
					class="mt-1 w-full p-3 bg-[#0c0c0c]/60 rounded-xl border border-[#252525] focus:outline-none focus:ring-1 focus:ring-[#c2ff00]/50"
				/>
			</div>

			<div class="pt-4 flex flex-col gap-3">
				<button
					on:click={changePassword}
					class="w-full px-4 py-3 bg-[#c2ff00]/10 hover:bg-[#c2ff00]/20 text-[#c2ff00] rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
					disabled={isUpdatingPassword}
				>
					<Icon icon="ph:key-bold" />
					Change Password
				</button>

				<button
					on:click={logout}
					class="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
				>
					<Icon icon="ph:sign-out-bold" />
					Logout
				</button>
			</div>
		</div>
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
