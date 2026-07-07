<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Icon = Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

	interface Props extends Omit<HTMLInputAttributes, 'size'> {
		value?: string;
		label?: string;
		labelClass?: string;
		icon?: Icon;
		prefix?: string;
		class?: string;
		wrapperClass?: string;
		glow?: boolean;
		size?: 'default' | 'sm';
	}

	let {
		value = $bindable(''),
		label,
		labelClass = 'font-mono text-xs text-muted-foreground',
		icon: Icon,
		prefix,
		class: className,
		wrapperClass,
		glow = true,
		size = 'default',
		id,
		type = 'text',
		...rest
	}: Props = $props();

	const inputClasses = $derived(
		cn(
			'peer w-full rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10',
			size === 'sm' ? 'h-9' : 'h-10',
			Icon || prefix ? 'pl-10 pr-4' : 'px-3',
			className
		)
	);
</script>

{#snippet field()}
	<div class={cn('relative isolate', wrapperClass)}>
		{#if Icon}
			<Icon
				class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden={true}
			/>
		{:else if prefix}
			<span
				class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
			>
				{prefix}
			</span>
		{/if}

		<input {id} {type} bind:value class={inputClasses} {...rest} />

		{#if glow}
			<div
				class="pointer-events-none absolute inset-x-1 bottom-0 h-px bg-gradient-to-r from-scpurple to-sccyan opacity-0 transition-opacity duration-300 peer-focus:opacity-70"
				aria-hidden="true"
			></div>
			<div
				class="pointer-events-none absolute inset-x-4 -bottom-0.5 -z-10 h-1.5 bg-gradient-to-r from-scpurple to-sccyan opacity-0 blur-sm transition-opacity duration-300 peer-focus:opacity-25"
				aria-hidden="true"
			></div>
			<div
				class="pointer-events-none absolute inset-x-10 -bottom-1 -z-10 h-2 bg-gradient-to-r from-scpurple to-sccyan opacity-0 blur transition-opacity duration-300 peer-focus:opacity-10"
				aria-hidden="true"
			></div>
		{/if}
	</div>
{/snippet}

{#if label}
	<div class="space-y-1.5">
		<label for={id} class={labelClass}>{label}</label>
		{@render field()}
	</div>
{:else}
	{@render field()}
{/if}
