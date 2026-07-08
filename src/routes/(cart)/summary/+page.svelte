<script lang="ts">
	import { Breadcrumbs } from '$lib/components/shell';
	import { ScButton } from '$lib/components/sc';
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-8 md:py-12">
		<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'summary' }]} />

		<div class="mt-16 flex flex-col items-center text-center">
			<p class="text-6xl font-semibold text-muted-foreground">404</p>
			<h1 class="mt-4 text-xl font-medium text-foreground">Page not found</h1>
			<p class="mt-2 max-w-sm text-sm text-muted-foreground">
				You aren't supposed to be here. Head back to browse crafts or check your cart.
			</p>
			<div class="mt-6 flex flex-wrap justify-center gap-3">
				<ScButton href="/crafts" arrow>Browse crafts</ScButton>
				<ScButton href="/cart" variant="secondary">View cart</ScButton>
			</div>
		</div>
	</div>
</div>
