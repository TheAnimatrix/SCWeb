<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

		import { Select as SelectPrimitive, type WithoutChildrenOrChild } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props();
</script>

<SelectPrimitive.ScrollUpButton
	bind:ref
	class={cn('flex cursor-default items-center justify-center py-1', className)}
	{...restProps}>
	<Icon icon={F.chevronUp} class="size-4" />
</SelectPrimitive.ScrollUpButton>
