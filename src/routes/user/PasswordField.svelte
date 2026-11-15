<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import { ScInput } from '$lib/components/sc';

	let {
		id,
		label,
		value = $bindable(''),
		autocomplete,
		placeholder,
		hint,
		size = 'default',
		required = false
	}: {
		id: string;
		label: string;
		value?: string;
		autocomplete: 'current-password' | 'new-password';
		placeholder?: string;
		hint?: string;
		size?: 'default' | 'sm';
		required?: boolean;
	} = $props();

	let visible = $state(false);
	const hintId = $derived(hint ? `${id}-hint` : undefined);
</script>

<div class="space-y-1.5">
	<label for={id} class="text-sm text-muted-foreground">{label}</label>
	<div class="relative">
		<ScInput
			{id}
			type={visible ? 'text' : 'password'}
			bind:value
			{placeholder}
			{autocomplete}
			{required}
			{size}
			aria-describedby={hintId}
			class="pr-11"
			icon={F.lock} />
		<button
			type="button"
			class="absolute right-1 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label={visible ? 'Hide password' : 'Show password'}
			aria-pressed={visible}
			aria-controls={id}
			onclick={() => (visible = !visible)}>
			<Icon icon={visible ? F.eyeOff : F.eye} class="size-4" />
		</button>
	</div>
	{#if hint}
		<p id={hintId} class="text-xs text-muted-foreground">{hint}</p>
	{/if}
</div>
