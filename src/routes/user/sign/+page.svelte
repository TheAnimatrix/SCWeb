<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidate, replaceState } from '$app/navigation';
	import { loading } from '$lib/stores/loading';
	import GlowleftInput from '$lib/components/fundamental/glowleft_input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	const triggerTabStyle =
		'data-[state=active]:bg-transparent data-[state=active]:drop-shadow-[0_4px_9px_rgba(255,123,1,0.59)] data-[state=active]:text-white px-4 py-2 text-4xl text-gray-500 rounded-xl hover:bg-scoranged2 text-orange-200 text-opacity-50 text-4xl font-bold max-w-[200px]';

	export let data;
	let { supabase_lt } = data;

	async function signWithGoogle(register: boolean) {
		if (register) {
		} else {
		}
		loading.set(true);
		const { user, error } = supabase_lt.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {},
				redirectTo: 'https://pfeewicqoxkuwnbuxnoz.supabase.co/auth/v1/callback'
			}
		});
		loading.set(false);
		if (error) {
			errorShow = register ? 2 : 1;
			errorText = error.message;
		}
	}

	async function signInWithEmail() {
		loading.set(true);
		const { data, error } = await supabase_lt.auth.signInWithPassword({
			email: emailLogin,
			password: passwordLogin
		});
		loading.set(false);
		if (error) {
			errorShow = 1;
			errorText = error.message;
		}
	}

	//TODO: change emailRedirectTo
	async function signUpNewUser() {
		loading.set(true);
		const { data, error } = await supabase_lt.auth.signUp({
			email: emailRegister,
			password: passwordRegister,
			options: {
				emailRedirectTo: `http://localhost:5173/user/profile`
			}
		});
		let userNameUpdate = await supabase_lt
			.from('users')
			.update({ username: usernameRegister })
			.eq('id', data.user?.id)
			.select();
		loading.set(false);
		if (error) {
			errorShow = 2;
			errorText = error.message;
		} else if (data && !data.session)
			errorText = `Please confirm your account to login. E-mail sent to ${emailRegister}`;
	}

	let emailLogin: string,
		emailRegister: string,
		usernameRegister: string,
		passwordRegister: string,
		passwordLogin: string,
		errorText: string,
		errorShow: number = 0;
</script>

<div class="min-h-screen w-full relative">
	<div class="h-full w-full z-[2] absolute">
		<div class="flex justify-center items-center h-full">
			<Tabs.Root
				value="Login"
				class="w-full flex flex-col justify-center items-center mb-20"
				id="crazy"
			>
				<Tabs.List class="p-2 h-fit w-fit rounded-xl overflow-x-auto bg-transparent">
					<Tabs.Trigger class={triggerTabStyle} value="Login"
						><span class="">Login</span></Tabs.Trigger
					>
					<Tabs.Trigger class={triggerTabStyle} value="Register"
						><span class="">Register</span></Tabs.Trigger
					>
				</Tabs.List>
				<Tabs.Content value="Login" class="text-white pb-4 rounded-xl min-h-[500px]">
					<div class="flex flex-col justify-center items-center">
						<GlowleftInput
							placeholder="E-Mail/Username"
							class="mt-4 md:w-96 max-sm:w-full"
							bind:value={emailLogin}
						/>
						<GlowleftInput
							placeholder="Password"
							class="mt-8 md:w-96 max-sm:w-full max-sm:mt-4"
							type="password"
							bind:value={passwordLogin}
						/>
						<div
							class="errorText text-center text-red-500 pt-4 font-bold"
							class:hidden={errorShow != 1}
						>
							{errorText}
						</div>
						<div class="w-full flex justify-center">
							<Button
								class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8"
								on:click={signInWithEmail}>Go</Button
							>
						</div>
						<div class="w-full flex justify-center">
							<Button
								class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8 on"
								on:click={() => signWithGoogle(true)}>Google</Button
							>
						</div>
					</div>
				</Tabs.Content>
				<Tabs.Content value="Register" class="text-white pb-4 rounded-xl min-h-[500px]">
					<div class="flex flex-col justify-center items-center">
						<GlowleftInput
							placeholder="E-Mail"
							class="mt-4 md:w-96 max-sm:w-full"
							bind:value={emailRegister}
						/>
						<GlowleftInput
							placeholder="Username"
							class="mt-8 md:w-96 max-sm:w-full max-sm:mt-4"
							bind:value={usernameRegister}
						/>
						<GlowleftInput
							placeholder="Password"
							class="mt-8 md:w-96 max-sm:w-full max-sm:mt-4"
							type="password"
							bind:value={passwordRegister}
						/>
						<div
							class="errorText text-center text-red-500 pt-4 font-bold"
							class:hidden={errorShow != 2}
						>
							{errorText}
						</div>
						<div class="w-full flex justify-center">
							<Button
								class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8 on"
								on:click={signUpNewUser}>Create Account</Button
							>
						</div>
						<div class="w-full flex justify-center">
							<Button
								class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8 on"
								on:click={() => signWithGoogle(true)}>Google</Button
							>
						</div>
					</div></Tabs.Content
				>
			</Tabs.Root>
		</div>
	</div>
	<div class="h-full w-full z-[1] absolute flex justify-center items-center overflow-hidden">
		<img alt="origami_crane" src="/images/crane.png" class="h-[400px] -ml-64 -mt-36" />
	</div>
</div>
