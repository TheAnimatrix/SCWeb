<script lang="ts">
	import GlowleftInput from '$libs/components/fundamental/glowleft_input.svelte';
	import Button from '$libs/components/ui/button/button.svelte';
	import * as Tabs from '$libs/components/ui/tabs';
	const triggerTabStyle =
		'data-[state=active]:bg-transparent data-[state=active]:drop-shadow-[0_4px_9px_rgba(255,123,1,0.59)] data-[state=active]:text-white px-4 py-2 text-4xl text-gray-500 rounded-xl hover:bg-scoranged2 text-orange-200 text-opacity-50 text-4xl font-bold max-w-[200px]';
</script>

<div class="h-screen w-full">
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
					<GlowleftInput placeholder="E-Mail/Username" class="mt-4 md:w-96 max-sm:w-full" />
					<GlowleftInput
						placeholder="Password"
						class="mt-8 md:w-96 max-sm:w-full max-sm:mt-4"
						type="password"
					/>
					<div class="w-full flex justify-center">
						<Button class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8 on">Go</Button>
					</div>
				</Tabs.Content>
				<Tabs.Content value="Register" class="text-white pb-4 rounded-xl min-h-[500px]">
					<GlowleftInput placeholder="E-Mail" class="mt-4 md:w-96 max-sm:w-full" />
					<GlowleftInput placeholder="Username" class="mt-8 md:w-96 max-sm:w-full" />
					<GlowleftInput
						placeholder="Password"
						class="mt-8 md:w-96 max-sm:w-full max-sm:mt-4"
						type="password"
					/>
					<div class="w-full flex justify-center">
						<Button class="p-4 mt-8 bg-scorange hover:bg-scorangel1 md:px-8 on"
							>Create Account</Button
						>
					</div></Tabs.Content
				>
				<Tabs.Content value="costing" class="text-white bg-scpurpled2 p-4 rounded-xl"
					>Costing details here</Tabs.Content
				>
				<Tabs.Content value="shipping" class="text-white bg-scpurpled2 p-4 rounded-xl"
					>Shipping details here</Tabs.Content
				>
			</Tabs.Root>
		</div>
	</div>
	<div class="h-full w-full z-[1] absolute flex justify-center items-center overflow-hidden">
		<img alt="origami_crane" src="/images/crane.png" class="h-[400px] -ml-64 -mt-36" />
	</div>
</div>
