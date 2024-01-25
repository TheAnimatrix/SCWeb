<script lang="ts">
	let isFocused = false;
	function onFocus() {
		isFocused = true;
	}
	function onBlur() {
		isFocused = false;
	}

	export let f11:string = '[box-shadow:0px_9px_34px_6px_rgba(255,_238,_180,_0.31)]';
	export let f12:string = 'shadow-none';
	export let f21:string = 'bg-[rgba(100,81,77,0.40)]';
	export let f22:string = 'bg-[rgba(53,42,37,0.40)]';
	export let gradient:string='bg-[linear-gradient(273deg,_#DA4373_0%,_#FF7B01_63.55%)]';
	let focusedStyle1: string, focusedStyle2: string;
	$: {
		focusedStyle1 = isFocused
			? f11
			: f12;
		focusedStyle2 = isFocused ? f21 : f22;
	};

    
    let className : string = "";
    export let placeholder : string;
    export let type : string = "";
    export { className as class };
</script>

<div class="{focusedStyle2} backdrop-blur-[3px] rounded-xl flex py-2 animate_base {className}">
	<div
		class="rounded-sm w-[3px] {gradient} {focusedStyle1} animate_base"
	/>
	<input
		on:blur={onBlur}
		on:focus={onFocus}
		class="focus:outline-none bg-transparent text-white opacity-40 text-xl not-italic font-semibold leading-[normal] self-center text-center h-full w-full px-4 py-2"
		{placeholder}
        {type}
	/>
</div>


<!-- 
    TODO:
        add visible button that on click hold only shows text
        add submit button that can use this input text
 -->