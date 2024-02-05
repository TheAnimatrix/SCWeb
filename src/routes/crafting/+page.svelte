<script lang="ts">
	import GlowleftInput from '$lib/components/fundamental/glowleft_input.svelte';
	import Icon from '@iconify/svelte';
</script>

<div class="text-3xl text-white flex-1 text-center flex flex-col justify-center items-center">
	<span class="font-bold text-2xl mx-4 mt-8">Crafting something cool?</span>
	<pre class="text-xl mx-4 font-figtree text-wrap mb-8">
Try selling it! Don't settle for just being a hobbyist or casual maker,
Recognize that whatever you're crafting likely addresses a genuine need,
potentially revolutionizing someone else's crafting journey.
We're all in this together so let's make the ecosystem better one craft at at time.</pre>
</div>
<br />
<div class="text-white bg-scredd1 p-8 w-full">
	<div class="flex flex-col justify-center items-center max-sm:w-[90%] w-[55%] mx-auto">
		<div class="text-scredl1 text-2xl font-bold">How it'll work</div>
		<div class="max-sm:flex-col flex mt-8 max-sm:space-x-0 max-sm:space-y-12 space-x-8 w-full">
			<div class="flex-1 w-full text-center text-xl">
				<b>It's simple really.</b>
				<ol class="max-sm:list-inside list-decimal mt-4 space-y-4">
					<li>
						You come up with an idea and make a prototype/homebrew product <span
							class="font-thin text-[#8B6565]"
							>(publish a gist of it on github/other platform with the right license first!)</span
						>
					</li>
					<li>You contact us with the details either through discord or e-mail</li>
					<li>
						After a basic quality assessment, your product will be listed on selfcrafted under your
						name with the quantity of units you've assembled
					</li>
					<li>To maintain customer guarantees all orders will be fulfilled by us</li>
				</ol>
			</div>
			<div class="flex-1 flex flex-col w-full text-center justify-center items-center">
				<b class="text-2xl text-scredl1">Join us on Discord</b>
				<span class="font-thin text-[#8B6565]"
					>Feel free to drop by even if you're not actively crafting
				</span>
				<a target="_blank" href="https://discord.gg/UQ74TQfMqM" rel="noopener noreferrer"
					><Icon icon="ph:discord-logo-duotone" class="text-7xl inline-block text-scred mt-4" />
				</a>
				<br />
				<!-- <span class="font-bold text-xl">or</span>
				<br />
				<span class="font-thin text-[hsl(0,_35%,_90%)] text-lg">Subscribe to important status updates</span>
				<GlowleftInput
                    class="mt-2"
					placeholder="E-Mail Address"
					gradient="bg-[linear-gradient(270deg,_#FF2448_5.55%,_#FF4722_91.01%)]"
					f11="[box-shadow:0px_9px_34px_6px_hsla(0,_100%,_70%,_0.4)]"
				/> -->
			</div>
		</div>
		<div class="mt-24 max-sm:mt-8 w-full text-lg text-scredl1 !text-left">
			We open source, all selfcrafted products are open sourced! but! your product rights are always
			yours only if that's your choice 5% fixed platform commission fees* if your product is a
			success we'll even help you scale up!
            <br><br>
			<ul class="list-disc max-sm:list-inside">
				<li>PCB Manufacturing</li>
				<li>Product enclosure Manufacturing</li>
				<li>Safety compliance</li>
				<li>Cheaper component sourcing</li>
				<li>Software assistance</li>
				<li>Better tooling for debugging etc.</li>
				<li>Customer surveys</li>
				<li>Advertising campaigns</li>
			</ul>
		</div>
        <br><br>
        <span class="text-white text-center mt-8">*for scale-up assistance platform commission fees is product dependent</span>
	</div>
</div>
<br /><br /><br /><br />
3
