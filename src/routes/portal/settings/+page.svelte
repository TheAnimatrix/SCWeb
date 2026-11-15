<script lang="ts">
	import { resolve } from '$app/paths';
	import { SeoHead } from '$lib/components/seo';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';

	let { data } = $props();

	const CAPABILITY_LABELS: Record<string, string> = {
		physical_goods: 'Sells products',
		printing_3d: '3D printing',
		digital_goods: 'Digital products'
	};

	const capabilities = $derived(
		(data.maker.capabilities ?? []).map((key: string) => CAPABILITY_LABELS[key] ?? key)
	);
</script>

<SeoHead meta={{ title: 'Settings · Maker portal', noindex: true }} />

<section class="max-w-xl space-y-6">
	<h2 class="text-xl font-semibold">Settings</h2>

	<dl class="space-y-4 text-sm">
		<div>
			<dt class="font-medium">Shop address</dt>
			<dd class="mt-1 text-muted-foreground">
				{#if data.maker.username}
					<span class="font-mono">{makerStorefrontPath(data.maker.username)}</span>. It comes from
					your account username.
				{:else}
					Not set yet. Your shop address comes from your account username.
				{/if}
			</dd>
		</div>
		<div>
			<dt class="font-medium">What your maker account can do</dt>
			<dd class="mt-1 text-muted-foreground">
				{#if capabilities.length}
					<ul class="list-inside list-disc">
						{#each capabilities as label (label)}
							<li>{label}</li>
						{/each}
					</ul>
				{:else}
					Nothing is enabled yet.
				{/if}
				<p class="mt-2">
					To change this, write to
					<a href="mailto:support@selfcrafted.in" class="underline">support@selfcrafted.in</a>.
				</p>
			</dd>
		</div>
	</dl>

	<a href={resolve('/user/profile/account')} class="inline-block text-sm underline"
		>Account settings</a>
</section>
