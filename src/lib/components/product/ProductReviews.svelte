<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import { page } from '$app/state';

	import { ReviewCard } from '$lib/components/sc';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';
	import { formatDate } from '$lib/utils/format';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';
	import { formatTimeAgo } from './productSpecs';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface Review {
		id: string;
		user_id: string;
		rating: number;
		comment: string;
		created_at: string;
		users?: { username?: string; tier?: string };
	}

	interface Props {
		productId: string;
		reviews?: Review[];
		initialReviews?: Review[];
		/** Set when the reviews call failed: shows "Reviews couldn't load." instead of "No reviews yet". */
		loadError?: string | null;
		supabase: SupabaseClient | null;
		class?: string;
		compact?: boolean;
		/** Compact mode: opens the full reviews tab. */
		onShowAll?: () => void;
	}

	let {
		productId,
		reviews = $bindable([]),
		initialReviews = [],
		loadError = null,
		supabase,
		class: className,
		compact = false,
		onShowAll
	}: Props = $props();

	let showReviewModal = $state(false);
	let reviewRating = $state(5);
	let reviewComment = $state('');
	let isSubmittingReview = $state(false);
	let reviewError = $state('');
	let isEditingReview = $state(false);
	let showDeleteConfirmation = $state(false);
	let deleteError = $state('');

	// The layout's session is known on the server too, so signed-out visitors see
	// "Sign in to review" straight away instead of a form that fails on submit.
	const currentUserId = $derived(
		(page.data.session?.user?.id as string | undefined) ??
			(page.data.user?.id as string | undefined) ??
			null
	);
	const isSignedIn = $derived(currentUserId !== null);
	const signInHref = $derived(
		`/user/sign?postLogin=${encodeURIComponent(`${page.url.pathname}${page.url.search}`)}`
	);

	const userReview = $derived(
		currentUserId ? (reviews.find((review) => review.user_id === currentUserId) ?? null) : null
	);

	$effect(() => {
		if (initialReviews.length > 0 && reviews.length === 0) {
			reviews = initialReviews;
		}
	});

	function openCreateModal() {
		isEditingReview = false;
		reviewRating = 5;
		reviewComment = '';
		reviewError = '';
		showReviewModal = true;
	}

	function editReview() {
		if (!userReview) return;

		isEditingReview = true;
		reviewRating = userReview.rating;
		reviewComment = userReview.comment;
		reviewError = '';
		showReviewModal = true;
	}

	async function submitReview() {
		if (!supabase) return;
		if (!reviewComment.trim()) {
			reviewError = 'Write a few words about the product.';
			return;
		}

		isSubmittingReview = true;
		reviewError = '';

		try {
			const user = await supabase.auth.getUser();
			if (!user.data?.user) {
				throw new Error('Sign in to write a review.');
			}

			// `user_id` is filled in by the database default (auth.uid()); the RLS policy
			// only allows inserting rows for yourself.
			const reviewData = {
				product_id: productId,
				rating: reviewRating,
				comment: reviewComment.trim()
			};

			const result =
				isEditingReview && userReview
					? await supabase
							.from('reviews')
							.update(reviewData)
							.eq('id', userReview.id)
							.select('*, users(username,tier)')
					: await supabase
							.from('reviews')
							.upsert(reviewData, { onConflict: 'product_id,user_id' })
							.select('*, users(username,tier)');

			if (result.error) throw result.error;

			showReviewModal = false;

			if (result.data && result.data.length > 0) {
				const updatedReview = result.data[0] as Review;

				if (isEditingReview && userReview) {
					reviews = reviews.map((review) =>
						review.id === userReview?.id ? updatedReview : review
					);
				} else {
					reviews = [
						updatedReview,
						...reviews.filter((review) => review.user_id !== updatedReview.user_id)
					];
				}
			}

			reviewComment = '';
			reviewRating = 5;
			isEditingReview = false;
		} catch (error) {
			console.error('[reviews] submit failed:', error);
			reviewError =
				error instanceof Error && error.message.startsWith('Sign in')
					? error.message
					: "Your review didn't save. Try again.";
		} finally {
			isSubmittingReview = false;
		}
	}

	async function deleteReview() {
		if (!supabase || !userReview) return;
		deleteError = '';

		try {
			const result = await supabase.from('reviews').delete().eq('id', userReview.id);
			if (result.error) throw result.error;

			reviews = reviews.filter((review) => review.id !== userReview?.id);
			showDeleteConfirmation = false;
		} catch (error) {
			console.error('[reviews] delete failed:', error);
			deleteError = "Your review wasn't deleted. Try again.";
		}
	}

	const buttonBase =
		'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm transition-colors';
	const primaryButton = cn(buttonBase, 'bg-foreground text-background hover:bg-foreground/90');
	const secondaryButton = cn(buttonBase, 'bg-card text-foreground hover:bg-muted');
</script>

{#snippet writeAction()}
	{#if !isSignedIn}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- sign-in path with a postLogin query -->
		<a href={signInHref} class={secondaryButton}>Sign in to review</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else if supabase}
		<button type="button" class={primaryButton} onclick={openCreateModal}>Write a review</button>
	{/if}
{/snippet}

<div class={cn('space-y-4', className)}>
	{#if compact}
		<h3 class="text-sm font-medium text-foreground">Reviews</h3>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h3 class="text-base font-medium text-foreground">
				{loadError ? 'Reviews' : `Reviews (${reviews.length})`}
			</h3>
			{#if !loadError}
				<div class="flex flex-wrap gap-2">
					{#if userReview}
						<button type="button" class={secondaryButton} onclick={editReview}>
							<Icon icon={F.edit} class="h-4 w-4" aria-hidden="true" />
							Edit review
						</button>
						<button
							type="button"
							class={cn(secondaryButton, 'text-destructive')}
							onclick={() => {
								deleteError = '';
								showDeleteConfirmation = true;
							}}>
							<Icon icon={F.delete} class="h-4 w-4" aria-hidden="true" />
							Delete
						</button>
					{:else if reviews.length > 0}
						{@render writeAction()}
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if loadError}
		<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">Reviews couldn't load.</p>
		</div>
	{:else if reviews.length > 0}
		<div class="space-y-3">
			{#each compact ? reviews.slice(0, 3) : reviews as review (review.id)}
				<ReviewCard
					rating={review.rating}
					username={formatUsernameDisplay(review.users?.username ?? 'Anonymous')}
					timeAgo={formatTimeAgo(review.created_at)}
					date={formatDate(review.created_at)}
					comment={review.comment}
					class={review.user_id === userReview?.user_id ? 'border-foreground/30' : undefined} />
			{/each}
		</div>
		{#if compact && reviews.length > 3}
			<button
				type="button"
				class="min-h-10 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
				onclick={() => onShowAll?.()}>
				See all {reviews.length} reviews
			</button>
		{/if}
	{:else}
		<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">No reviews yet.</p>
			{#if !compact}
				<div class="mt-4 flex justify-center">
					{@render writeAction()}
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if !compact}
	<Dialog.Root bind:open={showReviewModal}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>{isEditingReview ? 'Edit your review' : 'Write a review'}</Dialog.Title>
			</Dialog.Header>

			<div class="space-y-4">
				<fieldset>
					<legend class="mb-2 block text-sm font-medium text-foreground">Rating</legend>
					<div class="flex gap-1">
						{#each [...Array(5).keys()] as index (index)}
							<button
								type="button"
								class="inline-flex size-10 items-center justify-center rounded-md text-xl transition-colors hover:bg-muted"
								onclick={() => (reviewRating = index + 1)}
								aria-pressed={reviewRating === index + 1}
								aria-label="{index + 1} star{index === 0 ? '' : 's'}">
								<span
									class={index < reviewRating ? 'text-amber-400' : 'text-muted-foreground/40'}
									aria-hidden="true">
									★
								</span>
							</button>
						{/each}
					</div>
				</fieldset>

				<div>
					<label for="review-comment" class="mb-2 block text-sm font-medium text-foreground">
						Your review
					</label>
					<textarea
						id="review-comment"
						bind:value={reviewComment}
						class="min-h-32 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
						placeholder="How was the product?"></textarea>
				</div>

				{#if reviewError}
					<p class="text-sm text-destructive" role="alert">{reviewError}</p>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						class={cn(secondaryButton, 'flex-1')}
						onclick={() => (showReviewModal = false)}>
						Cancel
					</button>
					<button
						type="button"
						class={cn(primaryButton, 'flex-1 disabled:opacity-50')}
						disabled={isSubmittingReview}
						onclick={submitReview}>
						{isSubmittingReview ? 'Saving…' : isEditingReview ? 'Update review' : 'Submit review'}
					</button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={showDeleteConfirmation}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Delete your review</Dialog.Title>
				<Dialog.Description>This can't be undone.</Dialog.Description>
			</Dialog.Header>

			{#if deleteError}
				<p class="text-sm text-destructive" role="alert">{deleteError}</p>
			{/if}

			<div class="flex gap-3">
				<button
					type="button"
					class={cn(secondaryButton, 'flex-1')}
					onclick={() => (showDeleteConfirmation = false)}>
					Cancel
				</button>
				<button
					type="button"
					class={cn(
						buttonBase,
						'flex-1 border-transparent bg-destructive text-white hover:bg-destructive/90'
					)}
					onclick={deleteReview}>
					<Icon icon={F.delete} class="h-4 w-4" aria-hidden="true" />
					Delete review
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
