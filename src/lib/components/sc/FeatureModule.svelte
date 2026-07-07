<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		title: string;
		description: string;
		class?: string;
	}

	let { title, description, class: className }: Props = $props();
</script>

<div
	class={cn(
		'relative flex flex-col gap-2 border-r border-border px-6 py-6 last:border-r-0',
		className
	)}
>
	<h3 class="text-base font-medium text-foreground">{title}</h3>
	<p class="text-sm leading-relaxed text-muted-foreground">{description}</p>
</div>
