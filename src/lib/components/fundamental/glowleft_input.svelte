<script lang="ts">
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	
	
	
	
	
	
	
	
	
	
	interface Props {
		// Core props
		value?: string | undefined;
		placeholder?: string;
		type?: string;
		// Optional features
		icon?: string | undefined;
		iconPosition?: 'left' | 'right';
		iconClass?: string;
		label?: string | undefined;
		labelClass?: string;
		// Behavior
		animate?: boolean;
		pulseOnFocus?: boolean;
		readonly?: boolean;
		required?: boolean;
		spellcheck?: boolean;
		// Validation
		isValid?: boolean | undefined;
		errorMessage?: string | undefined;
		// Events
		onSubmit?: ((value: string) => void) | undefined;
		onFocusCallback?: (() => void) | undefined;
		onBlurCallback?: (() => void) | undefined;
	}

	let {
		value = $bindable(undefined),
		placeholder = '',
		type = 'text',
		icon = undefined,
		iconPosition = 'left',
		iconClass = 'text-xl',
		label = undefined,
		labelClass = 'text-xs font-medium text-gray-400 mb-1',
		animate = true,
		pulseOnFocus = true,
		readonly = false,
		required = false,
		spellcheck = false,
		isValid = undefined,
		errorMessage = undefined,
		onSubmit = undefined,
		onFocusCallback = undefined,
		onBlurCallback = undefined
	}: Props = $props();
	
	let isFocused = false;
	let inputElement: HTMLInputElement = $state();
	let containerElement: HTMLDivElement = $state();
	
	// Mouse position tracking
	let mouseX = $state(0);
	let mouseY = $state(0);
	
	function handleMouseMove(e: MouseEvent) {
		if (!containerElement) return;
		const rect = containerElement.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
	}
	
	function handleMouseLeave() {
		mouseX = 0;
		mouseY = 0;
	}
	
	// Event handlers
	function onFocus() {
		isFocused = true;
		if (onFocusCallback) onFocusCallback();
	}
	
	function onBlur() {
		isFocused = false;
		if (onBlurCallback) onBlurCallback();
	}
	
	function onInput(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		value = e.currentTarget.value || undefined;
	}
	
	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && onSubmit && value) {
			onSubmit(value);
		}
	}
	
	// Methods exposed to parent
	export function focus() {
		inputElement?.focus();
	}
	
	export function clear() {
		value = undefined;
		if (inputElement) inputElement.value = '';
	}
	
	export function setValue(newValue: string) {
		value = newValue;
		if (inputElement) inputElement.value = newValue;
	}
</script>

{#if label}
	<label class={labelClass}>{label}</label>
{/if}

<div 
	class="input-wrapper relative w-full"
	bind:this={containerElement}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
	<div 
		class="group relative flex items-center py-3 px-4 bg-white/5 hover:bg-white/10 border border-[#252525] rounded-xl transition-all duration-300"
		style="--mouse-x: {mouseX}px; --mouse-y: {mouseY}px;"
	>
		{#if icon && iconPosition === 'left'}
			<div class="mr-3 text-gray-400 group-hover:text-white transition-colors duration-300">
				<Icon {icon} class={iconClass} />
			</div>
		{/if}
		
		<input
			bind:this={inputElement}
			{type}
			{placeholder}
			{readonly}
			{required}
			{spellcheck}
			value={value || ''}
			oninput={onInput}
			onfocus={onFocus}
			onblur={onBlur}
			onkeydown={onKeyDown}
			class="w-full bg-transparent text-white text-xl not-italic font-semibold leading-[normal] focus:outline-hidden placeholder:text-gray-400 placeholder:opacity-50"
			aria-invalid={isValid === false}
			aria-errormessage={errorMessage ? `error-${placeholder}` : undefined}
		/>
		
		{#if icon && iconPosition === 'right'}
			<div class="ml-3 text-gray-400 group-hover:text-white transition-colors duration-300">
				<Icon {icon} class={iconClass} />
			</div>
		{/if}
		
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
	.input-wrapper {
		position: relative;
		overflow: hidden;
	}
	

	.input-wrapper > div:hover {
		border-color: hsl(var(--accent)/0.3);
		box-shadow: 
			0 0 0 1px hsl(var(--accent)/0.3),
			0 4px 20px -5px hsl(var(--accent)/0.3);
	}
	
	.input-wrapper > div:focus-within {
		border-color: hsl(var(--accent)/0.3);
		box-shadow: 
			0 0 0 1px hsl(var(--accent)/0.3),
			0 4px 20px -5px hsl(var(--accent)/0.3);
	}
</style>

<!-- 
    TODO:
        add visible button that on click hold only shows text
        add submit button that can use this input text
 -->

