<script lang="ts">
	let isFocused = false;
	function onFocus() {
		isFocused = true;
	}
	function onBlur() {
		isFocused = false;
		blur();
	}

	export let blur = ()=>{};

	//left side glow bar shadow (active)
	export let f11: string = '[box-shadow:0px_9px_34px_6px_rgba(255,_238,_180,_0.31)]';
	//left side glow bar shadow (inactive)
	export let f12: string = 'shadow-none';
	//bg shadow(active)
	export let f21: string = 'bg-[rgba(100,81,77,0.40)]';
	//bg-shadow(inactive)
	export let f22: string = 'bg-[rgba(53,42,37,0.40)]';
	//left side glow bar color gradient
	export let gradient: string = 'bg-[linear-gradient(273deg,_#DA4373_0%,_#FF7B01_63.55%)]';
	export let inputClass: string = "";
	let inputClassX = "focus:outline-none bg-transparent text-white text-xl not-italic font-semibold leading-[normal] self-center text-center h-full w-full px-4 py-2 placeholder-opacity-30 placeholder-white "+inputClass;
	let focusedStyle1: string, focusedStyle2: string;
	$: {
		focusedStyle1 = isFocused ? f11 : f12;
		focusedStyle2 = isFocused ? f21 : f22;
	}

	let className: string = '';
	export let placeholder: string;
	export let type: string = '';
	export let value: string;
	export { className as class };

	const onInput = (e: Event & { currentTarget: EventTarget & HTMLInputElement }) => {
		if (e.target && e.currentTarget.value) value = e.currentTarget.value;
	};
</script>

<div class="{focusedStyle2} backdrop-blur-[3px] rounded-xl flex py-2 animate_base {className}">
	<div class="rounded-sm w-[3px] {gradient} {focusedStyle1} animate_base" />
	<input
		on:blur={onBlur}
		on:focus={onFocus}
		class="{inputClassX}"
		{placeholder}
		{type}
		on:input={onInput}
	/>
</div>

<!-- 
    TODO:
        add visible button that on click hold only shows text
        add submit button that can use this input text
 -->
