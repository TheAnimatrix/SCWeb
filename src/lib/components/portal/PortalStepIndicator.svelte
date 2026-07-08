<script lang="ts">
	import { cn } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';

	interface Step {
		id: string;
		label: string;
		done?: boolean;
	}

	interface Props {
		steps: Step[];
		current: string;
		class?: string;
	}

	let { steps, current, class: className }: Props = $props();
</script>

<ol class={cn('flex flex-wrap items-center gap-2', className)} aria-label="Portal steps">
	{#each steps as step, i (step.id)}
		<li class="flex items-center gap-2">
			<div
				class={cn(
					'flex items-center gap-2.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
					step.id === current
						? 'border-primary bg-primary text-primary-foreground shadow-sm'
						: step.done
							? 'border-border bg-card text-foreground'
							: 'border-border bg-muted/40 text-muted-foreground'
				)}>
				<span
					class={cn(
						'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
						step.id === current
							? 'border-primary-foreground/30 bg-primary-foreground/10'
							: step.done
								? 'border-foreground bg-foreground text-background'
								: 'border-border'
					)}>
					{#if step.done && step.id !== current}
						<Check class="size-3" strokeWidth={2.5} />
					{:else}
						{i + 1}
					{/if}
				</span>
				<span>{step.label}</span>
			</div>
			{#if i < steps.length - 1}
				<span class="hidden text-muted-foreground/50 sm:inline" aria-hidden="true">→</span>
			{/if}
		</li>
	{/each}
</ol>
