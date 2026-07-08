<script lang="ts">
	import { modifyHtml } from '$lib/client/helper';

	interface Props {
		html: string;
	}

	let { html }: Props = $props();

	const modifiedHtml = $derived(modifyHtml(html));
</script>

<div
	class="break-words [overflow-wrap:anywhere] [&_a]:break-all [&_a]:!text-info [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:decoration-2 dark:[&_a]:!text-accent-dark [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:!border-border [&_td]:!border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_td]:px-3 [&_td]:py-2 [&_td]:text-left"
>
	{@html modifiedHtml}
</div>
