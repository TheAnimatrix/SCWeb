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

<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
	<ol class="flex flex-wrap items-center gap-1">
		{#each items as item, index (item.label + index)}
			{#if index > 0}
				<li aria-hidden="true" class="text-muted-foreground/60">/</li>
			{/if}
			<li class="min-w-0">
				{#if item.href}
					<a href={item.href} class="transition-colors hover:text-foreground">
						{item.label}
					</a>
				{:else}
					<span
						class="block max-w-[14rem] truncate text-foreground sm:max-w-md"
						title={item.label}
						aria-current="page">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
