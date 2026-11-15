<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import { cn } from '$lib/utils';

	interface Props {
		currentPage: number;
		totalPages: number;
		onPageChange?: (page: number) => void;
		hrefForPage?: (page: number) => string;
		class?: string;
	}

	let { currentPage, totalPages, onPageChange, hrefForPage, class: className }: Props = $props();

	type PageItem = { kind: 'page'; page: number } | { kind: 'gap'; key: string };

	/** 1 … n-1 n n+1 … last, so the row fits a 360px screen at any page count. */
	const items = $derived.by((): PageItem[] => {
		const total = Math.max(0, totalPages);
		const wanted = new Set<number>([1, total, currentPage - 1, currentPage, currentPage + 1]);
		const pages = [...wanted].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

		const result: PageItem[] = [];
		pages.forEach((page, index) => {
			const previous = pages[index - 1];
			if (previous != null && page - previous > 1) {
				result.push({ kind: 'gap', key: `gap-${previous}-${page}` });
			}
			result.push({ kind: 'page', page });
		});
		return result;
	});

	const hasPrevious = $derived(currentPage > 1);
	const hasNext = $derived(currentPage < totalPages);

	const baseClass =
		'flex h-11 min-w-11 items-center justify-center rounded-md border px-2 text-sm tabular-nums transition-colors';

	function pageClass(page: number): string {
		return cn(
			baseClass,
			page === currentPage
				? 'border-primary bg-primary text-primary-foreground'
				: 'border-border bg-card text-foreground hover:border-foreground/30'
		);
	}

	const stepClass = cn(
		baseClass,
		'gap-1 border-border bg-card px-3 text-foreground hover:border-foreground/30'
	);

	function handlePageClick(page: number, event: MouseEvent) {
		if (page === currentPage) {
			event.preventDefault();
			return;
		}
		onPageChange?.(page);
	}
</script>

{#snippet pageLink(
	page: number,
	label: string,
	className: string,
	content: string,
	icon?: string,
	iconAfter?: boolean
)}
	{#if hrefForPage}
		<a
			href={hrefForPage(page)}
			aria-label={label}
			aria-current={content === String(currentPage) && !icon ? 'page' : undefined}
			class={className}>
			{#if icon && !iconAfter}<Icon {icon} class="size-4" aria-hidden="true" />{/if}
			<span class={icon ? 'hidden sm:inline' : undefined}>{content}</span>
			{#if icon && iconAfter}<Icon {icon} class="size-4" aria-hidden="true" />{/if}
		</a>
	{:else}
		<button
			type="button"
			aria-label={label}
			aria-current={content === String(currentPage) && !icon ? 'page' : undefined}
			disabled={!icon && page === currentPage}
			onclick={(event) => handlePageClick(page, event)}
			class={className}>
			{#if icon && !iconAfter}<Icon {icon} class="size-4" aria-hidden="true" />{/if}
			<span class={icon ? 'hidden sm:inline' : undefined}>{content}</span>
			{#if icon && iconAfter}<Icon {icon} class="size-4" aria-hidden="true" />{/if}
		</button>
	{/if}
{/snippet}

{#if totalPages > 1}
	<nav aria-label="Pagination" class={cn('flex flex-wrap items-center gap-2', className)}>
		{#if hasPrevious}
			{@render pageLink(currentPage - 1, 'Previous page', stepClass, 'Previous', F.chevronLeft)}
		{/if}

		{#each items as item (item.kind === 'page' ? item.page : item.key)}
			{#if item.kind === 'gap'}
				<span
					class="flex h-11 min-w-6 items-center justify-center text-sm text-muted-foreground"
					aria-hidden="true">…</span>
			{:else}
				{@render pageLink(item.page, `Page ${item.page}`, pageClass(item.page), String(item.page))}
			{/if}
		{/each}

		{#if hasNext}
			{@render pageLink(currentPage + 1, 'Next page', stepClass, 'Next', F.chevronRight, true)}
		{/if}
	</nav>
{/if}
