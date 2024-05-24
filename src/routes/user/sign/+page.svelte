<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import {env} from '$env/dynamic/public';
	const PUBLIC_SITE_URL = (env.PUBLIC_SITE_URL == undefined)? null : env.PUBLIC_SITE_URL;
	const PUBLIC_VERCEL_URL = (env.PUBLIC_VERCEL_URL == undefined)? null : env.PUBLIC_VERCEL_URL;
	import { getContext, onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { goto, invalidate, replaceState } from '$app/navigation';
	import {setLoading } from '$lib/client/loading.js';
	import GlowleftInput from '$lib/components/fundamental/glowleft_input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { validatePassword } from '$lib/types/helper.js';
	import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
	const triggerTabStyle =
		'data-[state=active]:bg-transparent data-[state=active]:drop-shadow-[0_4px_9px_rgba(255,123,1,0.59)] data-[state=active]:text-white px-4 py-2 text-4xl text-gray-500 rounded-xl hover:bg-scoranged2 text-orange-200 text-opacity-50 text-4xl font-bold max-w-[200px]';

	export let data;
	let { supabase_lt } = data;

	const getURL = () => {
		let url =
			PUBLIC_SITE_URL ??
			PUBLIC_VERCEL_URL ??
			'http://localhost:5173/auth/callback';
		url = url.includes('http') ? url : `https://${url}`;
		return url;
	};

	let load_store = getContext<Writable<boolean>>('loading');
	async function signWithGoogle(register: boolean) {
		if (register) {
		} else {
		}
		setLoading(load_store,true);
		const { user, error } = supabase_lt.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {},
				redirectTo: getURL()+'?next=/user/profile/account/'
			}
		});
		setLoading(load_store,false);
		if (error) {
			errorShow = register ? 2 : 1;
			errorText = error.message;
		}
	}

	async function signInWithEmail() {
		setLoading(load_store,true);
		const { data, error } = await supabase_lt.auth.signInWithPassword({
			email: emailLogin,
			password: passwordLogin
		});
		setLoading(load_store,false);
		if (error) {
			errorShow = 1;
			errorText = error.message;
		}
	}

	//TODO: change emailRedirectTo
	async function signUpNewUser() {
		let k = validatePassword(passwordRegister ?? '', passwordRegister ?? '');
		
		if (k.error) {
			errorShow = 2;
			errorText = k.msg ?? 'yoyo';
			return;
		}
		setLoading(load_store,true);
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
		setLoading(load_store,false);
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
					<form on:submit|preventDefault>
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
							<GlowButton
								borderColor="border-scorange"
								buttonBgColor="bg-[#9c531e]"
								hoverCheckout="[box-shadow:0px_9px_34px_6px_hsla(25,_100%,_73.14%,_0.81)]"
								glowCheckout="[box-shadow:0px_9px_34px_6px_hsla(25,_100%,_73.14%,_0.3)]"
								class="mt-4"
								type="submit"
								on:click={signInWithEmail}>
									<div class="px-6 py-2">Go</div>
							</GlowButton>
							<div class="w-full flex justify-center">
								<Button
									class="p-6 mt-4 bg-scoranged2 hover:bg-scoranged1 "
									on:click={() => signWithGoogle(true)}
									><Icon icon="logos:google-icon" class="text-3xl" /></Button
								>
							</div>
						</div>
					</form>
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
						<Button
							class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8 self-center"
							on:click={signUpNewUser}>Create Account</Button
						>
						<div class="w-full flex justify-center">
							<Button
								class="p-6 mt-4 bg-scoranged2 hover:bg-scoranged1 "
								on:click={() => signWithGoogle(true)}
								><Icon icon="logos:google-icon" class="text-3xl" /></Button
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
