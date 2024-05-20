<script lang="ts">
    import { createEventDispatcher } from 'svelte'
	let checkoutHover = false;

    let hoverable = true;
	export let buttonBgColor = "bg-scblued3";
	export let borderColor = "border-scblue";
	export let hoverCheckout = `[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.61)]`;
	export let glowCheckout = `[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.3)]`;
    $: hoverable = !$$props.disabled;
    const dispatch = createEventDispatcher()
</script>

<button
	{...$$props}
    on:click={()=>{dispatch('click');}}
	on:focus={() => {}}
	on:mouseover={() => {
		if (hoverable) checkoutHover = true;
	}}
	on:mouseleave={() => (checkoutHover = false)}
	class="font-bold text-xl {buttonBgColor} rounded-lg shadow-none hover:shadow-md disabled:opacity-30 {$$props.class}"
>
	<hr
		id="checkoutGlow"
		class="animate_base mx-4 {borderColor} {checkoutHover ? hoverCheckout : glowCheckout}"
	/>
	<slot/>
</button>