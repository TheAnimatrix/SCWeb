<script lang="ts">
	import { modifyHtml } from '$lib/client/helper';

	interface Props {
		html: string;
	}

	let { html }: Props = $props();

	const modifiedHtml = $derived(modifyHtml(html));
</script>

<div>
	{@html modifiedHtml}
</div>
