<script lang="ts">
	import { SUPPORT_EMAIL } from '$lib/seo/site';

	interface Props {
		requestId: string;
	}

	let { requestId }: Props = $props();

	const mailto = $derived(
		`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Print request ${requestId}`)}`
	);
</script>

<p class="text-sm text-muted-foreground">
	Problem with this order? Write to
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- mailto link -->
	<a class="text-foreground underline underline-offset-2" href={mailto}>{SUPPORT_EMAIL}</a>
	and include request ID <span class="font-mono text-xs">{requestId}</span>.
</p>
