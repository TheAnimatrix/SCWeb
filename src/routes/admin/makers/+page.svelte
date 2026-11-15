<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { reviewApplication } from '$lib/client/makersApi';
	import { ScButton } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();
	let busyId = $state('');
	let notes = $state<Record<string, string>>({});
	let feedback = $state<{ text: string; error: boolean } | null>(null);

	const CAPABILITY_LABELS: Record<string, string> = {
		physical_goods: 'Sell products',
		printing_3d: '3D printing',
		digital_goods: 'Digital products'
	};

	type Answers = {
		display_name?: string | null;
		bio?: string | null;
		city?: string | null;
		links?: string | null;
	};

	function answersOf(app: Record<string, unknown>): Answers {
		return (app.answers ?? {}) as Answers;
	}

	function linkList(value: string | null | undefined): string[] {
		return (value ?? '')
			.split(/[\s,]+/)
			.map((part) => part.trim())
			.filter(Boolean);
	}

	function safeHref(value: string): string | null {
		const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
		try {
			const url = new URL(withScheme);
			return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
		} catch {
			return null;
		}
	}

	async function review(app: Record<string, unknown>, decision: 'approved' | 'rejected') {
		const id = String(app.id);
		const label = String(app.display_name || app.username || 'this applicant');
		const note = (notes[id] ?? '').trim();
		if (
			decision === 'rejected' &&
			!confirm(
				note
					? `Reject ${label}? They will see your note on the apply page.`
					: `Reject ${label} without a note? They will not see a reason.`
			)
		) {
			return;
		}
		busyId = id;
		feedback = null;
		const result = await reviewApplication(fetch, id, decision, note || undefined);
		busyId = '';
		if (!result.ok) {
			feedback = {
				text: `Could not save the decision for ${label}. ${result.error.message}`,
				error: true
			};
			return;
		}
		feedback = {
			text: decision === 'approved' ? `${label} is approved.` : `${label} was rejected.`,
			error: false
		};
		await invalidateAll();
	}
</script>

<SeoHead meta={{ title: 'Admin · Makers', noindex: true }} />

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="text-2xl font-semibold">Maker applications</h1>
	<p class="mt-1 text-sm text-muted-foreground">Approve or reject pending maker applications.</p>

	{#if data.error}
		<p class="mt-4 text-sm text-destructive" role="alert">{data.error}</p>
	{/if}
	{#if feedback}
		<p
			class="mt-4 text-sm {feedback.error ? 'text-destructive' : 'text-muted-foreground'}"
			role={feedback.error ? 'alert' : 'status'}>
			{feedback.text}
		</p>
	{/if}

	<div class="mt-6 space-y-4">
		{#each data.applications as app (app.id)}
			{@const answers = answersOf(app)}
			{@const id = String(app.id)}
			<div class="space-y-3 rounded-md border border-border p-4">
				<div>
					<p class="font-medium">{app.display_name || answers.display_name || 'No display name'}</p>
					<p class="text-sm text-muted-foreground">
						{#if app.username}@{app.username}{:else}No username{/if}
						{#if app.created_at}· Applied {formatDate(String(app.created_at))}{/if}
					</p>
				</div>

				<dl class="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
					<dt class="text-muted-foreground">Wants to</dt>
					<dd>
						{((app.requested_capabilities as string[] | undefined) ?? [])
							.map((key) => CAPABILITY_LABELS[key] ?? key)
							.join(', ') || 'Not stated'}
					</dd>
					<dt class="text-muted-foreground">City</dt>
					<dd>{answers.city || 'Not given'}</dd>
					<dt class="text-muted-foreground">About</dt>
					<dd class="whitespace-pre-line">{answers.bio || 'Not given'}</dd>
					<dt class="text-muted-foreground">Work</dt>
					<dd class="break-all">
						{#if linkList(answers.links).length}
							{#each linkList(answers.links) as link (link)}
								{@const href = safeHref(link)}
								{#if href}
									<!-- eslint-disable svelte/no-navigation-without-resolve -- external links supplied by the applicant -->
									<a
										{href}
										class="mr-3 underline"
										target="_blank"
										rel="noopener noreferrer nofollow">{link}</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{:else}
									<span class="mr-3">{link}</span>
								{/if}
							{/each}
						{:else}
							Not given
						{/if}
					</dd>
				</dl>

				<div class="space-y-1.5">
					<label for={`notes-${id}`} class="block text-sm font-medium"
						>Note to the applicant (optional)</label>
					<textarea
						id={`notes-${id}`}
						rows={2}
						maxlength={2000}
						value={notes[id] ?? ''}
						oninput={(e) =>
							(notes = { ...notes, [id]: (e.currentTarget as HTMLTextAreaElement).value })}
						class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					></textarea>
					<p class="text-xs text-muted-foreground">Shown to the applicant if you reject.</p>
				</div>

				<div class="flex gap-2">
					<ScButton disabled={busyId === id} onclick={() => review(app, 'approved')}
						>Approve</ScButton>
					<ScButton
						variant="secondary"
						disabled={busyId === id}
						onclick={() => review(app, 'rejected')}>Reject</ScButton>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No pending applications.</p>
		{/each}
	</div>
</div>
