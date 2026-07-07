<script lang="ts">
	interface BreadcrumbItem {
		label: string;
		href?: string;
	}

	interface Props {
		items: BreadcrumbItem[];
	}

	let { items }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class="font-mono text-xs text-muted-foreground">
	<ol class="flex flex-wrap items-center gap-1">
		{#each items as item, index (item.label + index)}
			{#if index > 0}
				<li aria-hidden="true" class="text-muted-foreground/60">/</li>
			{/if}
			<li>
				{#if item.href}
					<a href={item.href} class="transition-colors hover:text-foreground">
						{item.label}
					</a>
				{:else}
					<span class="text-foreground">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
