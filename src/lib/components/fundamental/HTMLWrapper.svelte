<script lang="ts">
	import { modifyHtml } from '$lib/client/helper';

	export let html: string;

	import { onMount } from 'svelte';

	let modifiedHtml: string;

	onMount(() => {
		// Modify style tags
		modifiedHtml = modifyHtml(html);
	});
</script>

<div>
	{@html modifiedHtml}
</div>
