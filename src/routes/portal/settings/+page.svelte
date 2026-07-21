<script lang="ts">
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();
</script>

<SeoHead meta={{ title: 'Settings · Portal', noindex: true }} />

<section class="space-y-4">
	<h2 class="text-xl font-semibold">Settings</h2>
	<p class="text-sm text-muted-foreground">
		Your public handle is <span class="font-mono">@{data.maker.username}</span> (from account
		username). Capabilities:
		{(data.maker.capabilities ?? []).join(', ') || 'none'}.
	</p>
	<a href="/user/profile/account" class="text-sm underline">Account settings</a>
</section>
