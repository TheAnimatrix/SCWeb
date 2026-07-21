<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		currentPage: number;
		totalPages: number;
		onPageChange?: (page: number) => void;
		hrefForPage?: (page: number) => string;
		class?: string;
	}

	let { currentPage, totalPages, onPageChange, hrefForPage, class: className }: Props = $props();

	const pages = $derived(Array.from({ length: Math.max(0, totalPages) }, (_, index) => index + 1));

	function handlePageClick(page: number, event: MouseEvent) {
		if (page === currentPage) {
			event.preventDefault();
			return;
		}
		onPageChange?.(page);
	}
</script>

{#if totalPages > 1}
	<nav aria-label="Pagination" class={cn('flex items-center gap-2', className)}>
		{#each pages as page (page)}
			{#if hrefForPage}
				<a
					href={hrefForPage(page)}
					aria-current={page === currentPage ? 'page' : undefined}
					class={cn(
						'flex h-8 w-8 items-center justify-center border font-mono text-xs transition-colors',
						page === currentPage
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border bg-card text-foreground hover:border-foreground/30'
					)}>
					{page}
				</a>
			{:else}
				<button
					type="button"
					aria-current={page === currentPage ? 'page' : undefined}
					disabled={page === currentPage}
					onclick={(event) => handlePageClick(page, event)}
					class={cn(
						'flex h-8 w-8 items-center justify-center border font-mono text-xs transition-colors',
						page === currentPage
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border bg-card text-foreground hover:border-foreground/30'
					)}>
					{page}
				</button>
			{/if}
		{/each}
	</nav>
{/if}
