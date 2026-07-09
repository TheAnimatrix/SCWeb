<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { toastStore } from '$lib/client/toastStore';
	import { listAvailableMakers } from '$lib/client/makersApi';
	import { ScButton, MakerRowSkeleton, TierBadge } from '$lib/components/sc';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { getTierStyle } from '$lib/types/tiers';
	import { cn } from '$lib/utils';
	import type { AvailableMaker } from '@scweb/api/contracts';
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';

	let {
		currentUserId = '',
		model,
		color = $bindable('#525252'),
		material = $bindable(null),
		quality,
		scale,
		infill,
		walls,
		requestQuoteCompleter
	}: {
		currentUserId?: string;
		model: File | null;
		color: string;
		material: string | null;
		quality: string;
		scale: number;
		infill: number;
		walls: number;
		requestQuoteCompleter: (
			maker_id: string,
			model: File | null,
			color: string,
			material: string,
			quality: string,
			scale: number,
			infill: number,
			walls: number,
			onProgress?: (progress: number | null) => void
		) => Promise<void>;
	} = $props();

	type Maker = Omit<AvailableMaker, 'filaments' | 'tier'> & {
		filaments: Record<
			string,
			Array<{
				color: string;
				material_type: string;
			}>
		>;
		tier: string;
	};

	let makers: Maker[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let expandedMaker = $state('');
	let loadingQuote = $state<string>('');
	let uploadProgress = $state<Record<string, number | null>>({});

	const hasModel = $derived(Boolean(model));

	function formatResponseTime(avgQuoteTime: number | null | string) {
		if (!avgQuoteTime) return null;
		const parts = avgQuoteTime.toString().split(':');
		const hh = parseInt(parts[0] ?? '0');
		const mm = parseInt(parts[1] ?? '0');
		const ss = parseInt(parts[2] ?? '0');
		if (hh > 24) return `~${Math.ceil(hh / 24)} days`;
		if (hh > 1) return `~${hh}.${(mm / 60).toFixed(1).split('.')[1]} hours`;
		if (mm > 15) return `~${mm}.${(ss / 60).toFixed(1).split('.')[1]} min`;
		return '~15 min';
	}

	async function requestQuote(
		maker_id: string,
		model: File | null,
		color: string,
		material: string,
		quality: string,
		scale: number,
		infill: number,
		walls: number
	) {
		if (!model) {
			toastStore.show('Upload a model first', 'error');
			return;
		}
		if (!color) {
			toastStore.show('Please select a color', 'error');
			return;
		}
		if (!material) {
			toastStore.show('Please select a material', 'error');
			return;
		}
		if (!quality) {
			toastStore.show('Please select a quality level', 'error');
			return;
		}
		if (!scale || scale <= 0) {
			toastStore.show('Please set a valid scale', 'error');
			return;
		}
		if (!infill || infill < 0 || infill > 100) {
			toastStore.show('Please set a valid infill percentage', 'error');
			return;
		}

		const selectedMaker = makers.find((maker) => maker.maker_id === maker_id);
		let validateCombo = selectedMaker != null;
		validateCombo = validateCombo && Object.keys(selectedMaker?.filaments ?? {}).length > 0;
		validateCombo = validateCombo && Object.keys(selectedMaker?.filaments ?? {}).includes(material);
		validateCombo =
			validateCombo &&
			selectedMaker?.filaments[material]?.find((filament) => filament.color === color) != null;

		if (!validateCombo) {
			toastStore.show('This maker does not support this color/material combination', 'error');
			return;
		}

		await requestQuoteCompleter(
			maker_id,
			model,
			color,
			material,
			quality,
			scale,
			infill,
			walls,
			(progress: number | null) => {
				loadingQuote = progress !== null ? maker_id : '';
				uploadProgress = { ...uploadProgress, [maker_id]: progress };
			}
		);
	}

	onMount(async () => {
		loading = true;
		try {
			const response = await listAvailableMakers(fetch);

			if (!response.ok) {
				error = response.error.message || 'Failed to load makers.';
				loading = false;
				return;
			}

			const profileRows = response.data.makers;
			makers = profileRows
				.map((maker) => ({
					...maker,
					reviews: maker.reviews ?? [],
					filaments: groupFilaments(maker.filaments),
					tier: maker.tier ?? 'Bee'
				}))
				.filter(isMakerRow);

			if (makers.length === 1) {
				expandedMaker = makers[0].maker_id;
			}
		} catch (e) {
			console.error(e);
			error = 'Error loading makers.';
		} finally {
			loading = false;
		}
	});

	function toggleMaker(id: string) {
		expandedMaker = expandedMaker === id ? '' : id;
	}

	function averageRating(reviews: Maker['reviews']) {
		if (!reviews?.length) return null;
		return (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1);
	}

	function groupFilaments(
		filaments: AvailableMaker['filaments']
	): Maker['filaments'] {
		const filamentObj: Record<string, Array<{ color: string; material_type: string }>> = {};
		for (const filament of filaments) {
			if (!filamentObj[filament.material_type]) {
				filamentObj[filament.material_type] = [];
			}
			filamentObj[filament.material_type].push(filament);
		}
		return filamentObj;
	}

	function isMakerRow(row: Maker): boolean {
		return (
			typeof row.maker_id === 'string' &&
			typeof row.crafter_name === 'string' &&
			typeof row.tier === 'string' &&
			typeof row.price_rank === 'number' &&
			typeof row.delivery_rank === 'number' &&
			Object.keys(row.filaments).length > 0 &&
			Array.isArray(row.reviews)
		);
	}
</script>

<section id="makers" class="scroll-mt-24">
	<PortalCard>
		<div class="mb-1 flex flex-wrap items-end justify-between gap-3">
			<div>
				<div class="mb-1 flex items-center gap-2">
					<Icon icon={F.people} class="size-4 text-muted-foreground" />
					<span class="text-sm font-medium text-foreground">Available makers</span>
					{#if !loading}
						<span class="text-xs text-muted-foreground">({makers.length})</span>
					{/if}
				</div>
				<p class="text-sm text-muted-foreground">
					Expand a maker, pick a filament color, then request your quote.
				</p>
			</div>
		</div>

		{#if !hasModel}
			<div
				class="mt-4 flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/20 px-4 py-3">
				<Icon icon={F.errorCircle} class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">
					Upload a model above to unlock maker selection and quote requests.
				</p>
			</div>
		{/if}

		{#if loading}
			<div class="mt-6" aria-hidden="true">
				<MakerRowSkeleton count={3} />
			</div>
		{:else if error}
			<div class="mt-6 py-8 text-center text-sm text-destructive">{error}</div>
		{:else if makers.length === 0}
			<div class="mt-6 py-8 text-center text-sm text-muted-foreground">
				No makers available right now. Check back soon.
			</div>
		{:else}
			<div class="mt-6 space-y-3">
				{#each makers as maker (maker.maker_id)}
					{@const isSelf = maker.maker_id === currentUserId}
					{@const isExpanded = expandedMaker === maker.maker_id}
					{@const rating = averageRating(maker.reviews)}
					{@const tierStyle = getTierStyle(maker.tier)}
					<div
						class={cn(
							'overflow-hidden rounded-lg border bg-card transition-colors',
							isExpanded ? cn('shadow-sm', tierStyle.cardExpanded) : tierStyle.card,
							isSelf && 'opacity-60'
						)}>
						<button
							type="button"
							class={cn(
								'flex w-full items-center justify-between gap-4 p-4 text-left transition-colors',
								tierStyle.buttonHover
							)}
							onclick={() => toggleMaker(maker.maker_id)}
							aria-expanded={isExpanded}>
							<div class="flex min-w-0 items-center gap-3">
								<TierBadge tier={maker.tier} iconOnly class="size-10" />
								<div class="min-w-0">
									<div class="truncate font-medium text-foreground">{maker.crafter_name}</div>
									<div
										class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
										<span
											>{maker.number_of_printers ?? 0} printer{maker.number_of_printers === 1
												? ''
												: 's'}</span>
										<span>{maker.completed_orders ?? 0} orders</span>
										{#if maker.max_printer_size}
											<span>{maker.max_printer_size} max</span>
										{/if}
									</div>
								</div>
							</div>

							<div class="flex shrink-0 items-center gap-3">
								{#if rating}
									<div class="flex items-center gap-1 text-sm text-foreground">
										<Icon icon={F.star} class="size-3.5 fill-foreground text-foreground" />
										<span>{rating}</span>
										<span class="text-muted-foreground">({maker.reviews.length})</span>
									</div>
								{:else}
									<span class="text-xs text-muted-foreground">No ratings</span>
								{/if}
								{#if isExpanded}
									<Icon icon={F.chevronUp} class="size-4 text-muted-foreground" />
								{:else}
									<Icon icon={F.chevronDown} class="size-4 text-muted-foreground" />
								{/if}
							</div>
						</button>

						{#if isSelf}
							<div
								class="border-t border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
								You can't request a quote from yourself.
							</div>
						{/if}

						{#if isExpanded}
							<div
								class={cn('border-t border-border px-4 pb-4 pt-3', isSelf && 'pointer-events-none')}
								in:slide={{ duration: 200, easing: cubicOut }}
								out:slide={{ duration: 200, easing: cubicOut }}>
								<div class="mb-4 flex flex-wrap gap-2">
									<span class="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
										Affordability {maker.price_rank}/5
									</span>
									<span class="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
										Delivery {maker.delivery_rank}/5
									</span>
									{#if maker.avg_quote_time}
										{@const response = formatResponseTime(maker.avg_quote_time)}
										{#if response}
											<span
												class="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
												<Icon icon={F.timer} class="size-3" />
												Response {response}
											</span>
										{/if}
									{/if}
								</div>

								<PortalSectionLabel label="Filament color" />
								<div class="mt-2 space-y-3">
									{#each Object.keys(maker.filaments) as mat (mat)}
										<div class="rounded-md border border-border bg-muted/20 p-3">
											<div class="mb-2 flex items-center gap-2">
												<Icon icon={F.print} class="size-3.5 text-muted-foreground" />
												<span class="text-xs font-medium text-foreground">{mat}</span>
											</div>
											<div class="flex flex-wrap gap-2">
												{#each maker.filaments[mat] as filament, index (`${mat}-${index}-${filament.color}`)}
													<button
														type="button"
														class={cn(
															'relative size-8 rounded-md border-2 transition-all',
															color === filament.color && material === mat
																? 'scale-110 border-primary ring-2 ring-primary/10'
																: 'border-border hover:scale-105 hover:border-foreground/40'
														)}
														onclick={() => {
															color = filament.color;
															material = mat;
														}}
														aria-label="Select {mat} {filament.color}"
														title="{mat} · {filament.color}">
														<span
															class="block size-full rounded-[4px]"
															style="background-color: {filament.color};"></span>
													</button>
												{/each}
											</div>
										</div>
									{/each}
								</div>

								<div class="mt-5">
									<ScButton
										class="w-full"
										disabled={!hasModel || loadingQuote === maker.maker_id}
										onclick={() => {
											if (loadingQuote === maker.maker_id) return;
											requestQuote(
												maker.maker_id,
												model,
												color ?? '',
												material ?? '',
												quality,
												scale,
												infill,
												walls
											);
										}}>
										{#if loadingQuote === maker.maker_id}
											{#if uploadProgress[maker.maker_id] != null}
												Requesting quote… {uploadProgress[maker.maker_id]}%
											{:else}
												Requesting quote…
											{/if}
										{:else if !hasModel}
											Upload a model first
										{:else}
											Request quote →
										{/if}
									</ScButton>

									{#if loadingQuote === maker.maker_id && uploadProgress[maker.maker_id] != null}
										<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
											<div
												class="h-full rounded-full bg-foreground transition-all duration-300"
												style="width: {uploadProgress[maker.maker_id]}%">
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</PortalCard>
</section>
