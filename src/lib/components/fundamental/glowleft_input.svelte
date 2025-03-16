<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut, elasticOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';
	
	let isFocused = false;
	function onFocus() {
		isFocused = true;
		if (typeof onFocusCallback === 'function') onFocusCallback();
	}
	function onBlur() {
		isFocused = false;
		blur();
		if (typeof onBlurCallback === 'function') onBlurCallback();
	}

	export let blur = () => {};
	export let onFocusCallback: (() => void) | undefined = undefined;
	export let onBlurCallback: (() => void) | undefined = undefined;

	// Left side glow bar shadow (active)
	export let f11: string = '[box-shadow:0px_9px_34px_6px_rgba(255,_238,_180,_0.31)]';
	// Left side glow bar shadow (inactive)
	export let f12: string = 'shadow-none';
	// Background shadow (active)
	export let f21: string = 'bg-[rgba(100,81,77,0.40)]';
	// Background shadow (inactive)
	export let f22: string = 'bg-[rgba(53,42,37,0.40)]';
	// Left side glow bar color gradient
	export let gradient: string = 'bg-[linear-gradient(273deg,_#DA4373_0%,_#FF7B01_63.55%)]';
	
	// Optional icon properties
	export let icon: string | undefined = undefined;
	export let iconPosition: 'left' | 'right' = 'left';
	export let iconClass: string = 'text-xl';
	export let iconColor: string = '';
	
	// Optional label
	export let label: string | undefined = undefined;
	export let labelClass: string = 'text-xs font-medium text-gray-400 mb-1';
	
	// Animations
	export let animate: boolean = true;
	export let pulseOnFocus: boolean = true;
	
	export let inputClass: string = "";
	let inputClassX = "focus:outline-none bg-transparent text-white text-xl not-italic font-semibold leading-[normal] self-center h-full w-full px-4 py-2 placeholder-opacity-30 placeholder-white " + inputClass;
	
	let focusedStyle1: string, focusedStyle2: string;
	$: {
		focusedStyle1 = isFocused ? f11 : f12;
		focusedStyle2 = isFocused ? f21 : f22;
	}

	let className: string = '';
	export let inputElement: HTMLInputElement | undefined = undefined;
	export let placeholder: string;
	export let type: string = '';
	export let value: string | undefined;
	export { className as class };

	const onInput = (e: Event & { currentTarget: EventTarget & HTMLInputElement }) => {
		if (e.currentTarget) {
			value = e.currentTarget.value;
			if (e.currentTarget.value == '') value = undefined;
		}
	};

	$: {
		if (inputElement) inputElement.value = value || '';
	}
	
	// Optional features for advanced usage
	export let autocomplete: string | undefined = undefined;
	export let spellcheck: boolean = false;
	export let readonly: boolean = false;
	export let required: boolean = false;
	export let maxlength: number | undefined = undefined;
	export let minlength: number | undefined = undefined;
	export let pattern: string | undefined = undefined;
	
	// Input validation
	export let isValid: boolean | undefined = undefined;
	export let errorMessage: string | undefined = undefined;
	
	// Design enhancements
	export let rounded: string = 'rounded-xl';
	export let height: string = 'h-12';
	export let width: string = 'w-full';
	export let glowStrength: 'low' | 'medium' | 'high' = 'medium';
	
	// Compute the glow strength class
	let glowStrengthClass: string;
	$: {
		if (glowStrength === 'low') {
			glowStrengthClass = 'animate-glow-subtle';
		} else if (glowStrength === 'high') {
			glowStrengthClass = 'animate-glow-strong';
		} else {
			glowStrengthClass = 'animate-glow';
		}
	}
	
	// Text alignment
	export let textAlign: 'left' | 'center' | 'right' = 'center';
	let textAlignClass: string;
	$: {
		if (textAlign === 'left') {
			textAlignClass = 'text-left';
		} else if (textAlign === 'right') {
			textAlignClass = 'text-right';
		} else {
			textAlignClass = 'text-center';
		}
	}
</script>

{#if label}
	<label class={labelClass}>{label}</label>
{/if}

<div class="input-wrapper {width} relative {className}">
	<div 
		class="{focusedStyle2} backdrop-blur-[3px] {rounded} flex items-center py-2 transition-all duration-300 {height} {isFocused && pulseOnFocus ? glowStrengthClass : ''}"
	>
		<!-- Left glow bar with enhanced animation -->
		<div 
			class="rounded-sm w-[3px] {gradient} {focusedStyle1} transition-all duration-300 {height} {isFocused ? 'scale-y-100' : 'scale-y-90'}"
			style="transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);"
		/>
		
		<!-- Left icon if enabled -->
		{#if icon && iconPosition === 'left'}
			<div class="ml-3 {iconColor || (isFocused ? 'text-white' : 'text-gray-400')} transition-colors duration-300">
				<Icon icon={icon} class={iconClass} />
			</div>
		{/if}
		
		<!-- Input element -->
		<input
			on:blur={onBlur}
			on:focus={onFocus}
			class="{inputClassX} {textAlignClass} transition-all duration-300"
			{placeholder}
			{type}
			{readonly}
			{required}
			{spellcheck}
			{pattern}
			{maxlength}
			{minlength}
			on:input={onInput}
			bind:this={inputElement}
			autocomplete={autocomplete || 'off'}
			aria-invalid={isValid === false}
			aria-errormessage={errorMessage ? `error-${placeholder}` : undefined}
		/>
		
		<!-- Right icon if enabled -->
		{#if icon && iconPosition === 'right'}
			<div class="mr-3 {iconColor || (isFocused ? 'text-white' : 'text-gray-400')} transition-colors duration-300">
				<Icon icon={icon} class={iconClass} />
			</div>
		{/if}
		
		<!-- Validation state icons -->
		{#if isValid !== undefined}
			<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
				{#if isValid}
					<Icon icon="ph:check-circle" class="text-green-400 text-xl" />
				{:else}
					<Icon icon="ph:warning-circle" class="text-red-400 text-xl" />
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Error message -->
	{#if errorMessage && isValid === false}
		<div 
			class="text-red-400 text-sm mt-1 pl-2"
			id={`error-${placeholder}`}
			transition:fade={{ duration: 200 }}
		>
			{errorMessage}
		</div>
	{/if}
</div>

<style>
	/* Basic animations */
	.animate-glow {
		animation: pulseShadow 2.5s infinite;
	}
	
	.animate-glow-subtle {
		animation: pulseShadowSubtle 3s infinite;
	}
	
	.animate-glow-strong {
		animation: pulseShadowStrong 2s infinite;
	}
	
	/* Transition utilities */
	.transition-all {
		transition-property: all;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 300ms;
	}
	
	.transition-transform {
		transition-property: transform;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 300ms;
	}
	
	.transition-colors {
		transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 300ms;
	}
	
	@keyframes pulseShadow {
		0% {
			box-shadow: 0 0 5px 0 rgba(255, 255, 255, 0.1);
		}
		50% {
			box-shadow: 0 0 15px 0 rgba(255, 255, 255, 0.2);
		}
		100% {
			box-shadow: 0 0 5px 0 rgba(255, 255, 255, 0.1);
		}
	}
	
	@keyframes pulseShadowSubtle {
		0% {
			box-shadow: 0 0 3px 0 rgba(255, 255, 255, 0.05);
		}
		50% {
			box-shadow: 0 0 8px 0 rgba(255, 255, 255, 0.1);
		}
		100% {
			box-shadow: 0 0 3px 0 rgba(255, 255, 255, 0.05);
		}
	}
	
	@keyframes pulseShadowStrong {
		0% {
			box-shadow: 0 0 8px 0 rgba(255, 255, 255, 0.15);
		}
		50% {
			box-shadow: 0 0 25px 0 rgba(255, 255, 255, 0.3);
		}
		100% {
			box-shadow: 0 0 8px 0 rgba(255, 255, 255, 0.15);
		}
	}
</style>

<!-- 
    TODO:
        add visible button that on click hold only shows text
        add submit button that can use this input text
 -->
