<script lang="ts">
	import { X, Trash2, Pencil, LoaderCircle } from '@lucide/svelte';
	import { ReviewCard } from '$lib/components/sc';
	import { cn } from '$lib/utils';
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
		supabase: SupabaseClient;
		class?: string;
		compact?: boolean;
	}

	let {
		productId,
		reviews = $bindable([]),
		initialReviews = [],
		supabase,
		class: className,
		compact = false
	}: Props = $props();

	let showReviewModal = $state(false);
	let reviewRating = $state(5);
	let reviewComment = $state('');
	let isSubmittingReview = $state(false);
	let reviewSuccess = $state<boolean | null>(null);
	let reviewError = $state('');
	let isEditingReview = $state(false);
	let showDeleteConfirmation = $state(false);
	let currentUserId = $state<string | null>(null);

	const userReview = $derived(
		currentUserId ? reviews.find((review) => review.user_id === currentUserId) ?? null : null
	);

	$effect(() => {
		if (initialReviews.length > 0 && reviews.length === 0) {
			reviews = initialReviews;
		}
	});

	$effect(() => {
		void supabase.auth.getUser().then((result) => {
			currentUserId = result.data.user?.id ?? null;
		});
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
		if (!reviewComment.trim()) {
			reviewError = 'Please enter a review comment';
			return;
		}

		isSubmittingReview = true;
		reviewError = '';

		try {
			const user = await supabase.auth.getUser();
			if (!user.data?.user) {
				throw new Error('You must be logged in to submit a review');
			}

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

			reviewSuccess = true;
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

				// Update userReview reference via reviews list refresh
			}

			reviewComment = '';
			reviewRating = 5;
			isEditingReview = false;
		} catch (error) {
			reviewSuccess = false;
			reviewError =
				error instanceof Error ? error.message : 'Failed to submit review. Please try again.';
		} finally {
			isSubmittingReview = false;
		}
	}

	async function deleteReview() {
		if (!userReview) return;

		try {
			const result = await supabase.from('reviews').delete().eq('id', userReview.id);
			if (result.error) throw result.error;

			reviews = reviews.filter((review) => review.id !== userReview?.id);
			showDeleteConfirmation = false;
		} catch (error) {
			reviewError =
				error instanceof Error ? error.message : 'Failed to delete review. Please try again.';
		}
	}
</script>

<div class={cn('space-y-4', className)}>
	{#if !compact}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h3 class="font-mono text-sm text-foreground">reviews ({reviews.length})</h3>
			<div class="flex flex-wrap gap-2">
				{#if userReview}
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted"
						onclick={editReview}
					>
						<Pencil class="h-3.5 w-3.5" />
						edit_review
					</button>
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-destructive transition-colors hover:bg-muted"
						onclick={() => (showDeleteConfirmation = true)}
					>
						<Trash2 class="h-3.5 w-3.5" />
						delete
					</button>
				{:else}
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-md border border-border bg-foreground px-3 py-1.5 font-mono text-xs text-background transition-colors hover:bg-foreground/90"
						onclick={openCreateModal}
					>
						add_review
					</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if reviews.length > 0}
		<div class="space-y-3">
			{#each compact ? reviews.slice(0, 3) : reviews as review (review.id)}
				<ReviewCard
					rating={review.rating}
					username={review.users?.username ?? 'anonymous'}
					timeAgo={formatTimeAgo(review.created_at)}
					comment={review.comment}
					class={review.user_id === userReview?.user_id ? 'border-foreground/30' : undefined}
				/>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
			<p class="font-mono text-sm text-muted-foreground">no_reviews_yet</p>
			<p class="mt-1 text-sm text-foreground">Be the first to review this product.</p>
			{#if !compact}
				<button
					type="button"
					class="mt-4 inline-flex items-center rounded-md border border-border bg-foreground px-3 py-1.5 font-mono text-xs text-background"
					onclick={openCreateModal}
				>
					add_review
				</button>
			{/if}
		</div>
	{/if}

	{#if compact && reviews.length > 3}
		<p class="font-mono text-xs text-muted-foreground">+{reviews.length - 3} more in reviews tab</p>
	{/if}
</div>

{#if showReviewModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
			<button
				type="button"
				class="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
				onclick={() => (showReviewModal = false)}
				aria-label="Close review modal"
			>
				<X class="h-5 w-5" />
			</button>

			<h2 class="pr-8 text-lg font-semibold text-foreground">
				{isEditingReview ? 'Edit your review' : 'Write a review'}
			</h2>

			<div class="mt-4 space-y-4">
				<div>
					<span class="mb-2 block font-mono text-xs text-muted-foreground">rating</span>
					<div class="flex gap-1">
						{#each Array(5) as _, index (index)}
							<button
								type="button"
								class="px-1 font-mono text-lg transition-colors"
								onclick={() => (reviewRating = index + 1)}
								aria-label="Rate {index + 1} stars"
							>
								<span class={index < reviewRating ? 'text-foreground' : 'text-muted-foreground/40'}>
									★
								</span>
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="review-comment" class="mb-2 block font-mono text-xs text-muted-foreground">
						comment
					</label>
					<textarea
						id="review-comment"
						bind:value={reviewComment}
						class="min-h-32 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
						placeholder="Share your experience with this product..."
					></textarea>
				</div>

				{#if reviewError}
					<p class="font-mono text-xs text-destructive">{reviewError}</p>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						class="flex-1 rounded-md border border-border bg-card px-4 py-2 font-mono text-sm text-foreground hover:bg-muted"
						onclick={() => (showReviewModal = false)}
					>
						cancel
					</button>
					<button
						type="button"
						class="flex flex-1 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background hover:bg-foreground/90 disabled:opacity-50"
						disabled={isSubmittingReview}
						onclick={submitReview}
					>
						{#if isSubmittingReview}
							<LoaderCircle class="h-4 w-4 animate-spin" />
						{/if}
						{isEditingReview ? 'update_review' : 'submit_review'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showDeleteConfirmation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
			<h2 class="text-lg font-semibold text-foreground">Delete your review</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Are you sure you want to delete your review? This action cannot be undone.
			</p>

			<div class="mt-6 flex gap-3">
				<button
					type="button"
					class="flex-1 rounded-md border border-border bg-card px-4 py-2 font-mono text-sm text-foreground hover:bg-muted"
					onclick={() => (showDeleteConfirmation = false)}
				>
					cancel
				</button>
				<button
					type="button"
					class="flex flex-1 items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 font-mono text-sm text-white hover:bg-destructive/90"
					onclick={deleteReview}
				>
					<Trash2 class="h-4 w-4" />
					delete_review
				</button>
			</div>
		</div>
	</div>
{/if}
