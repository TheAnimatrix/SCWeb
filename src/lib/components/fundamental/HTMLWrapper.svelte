<script lang="ts">
	import { modifyHtml } from '$lib/client/helper';


	import { onMount } from 'svelte';
	interface Props {
		html: string;
	}

	let { html }: Props = $props();

	let modifiedHtml: string = $state();

	onMount(() => {
		// Modify style tags
		modifiedHtml = modifyHtml(html);
	});
</script>

<div>
	{@html modifiedHtml}
</div>
