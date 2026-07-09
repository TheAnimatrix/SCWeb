<script lang="ts">
	import { DotGrid, ScButton } from '$lib/components/sc';
	import { ScLogo } from '$lib/components/shell';
	import { theme } from '$lib/client/theme';
</script>

<DotGrid class="relative min-h-screen overflow-hidden">
	<div class="relative z-10 mx-auto flex max-w-md flex-col px-4 py-10 text-center">
		<a href="/" class="mb-8 inline-flex self-center">
			<ScLogo variant={$theme === 'light' ? 'light' : 'dark'} />
		</a>

		<div class="rounded-md border border-border bg-card p-6">
			<h1 class="text-xl font-semibold text-foreground">Sign-in failed</h1>
			<p class="mt-3 text-sm text-muted-foreground">
				We could not complete your sign-in. The link may have expired or already been used.
			</p>
			<ScButton class="mt-6 w-full justify-center" href="/user/sign">Back to sign in</ScButton>
		</div>
	</div>
</DotGrid>
