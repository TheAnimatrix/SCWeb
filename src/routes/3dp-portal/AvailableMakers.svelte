<script lang="ts">
	import { toastStore } from '$lib/client/toastStore';
	import Button from '$lib/components/ui/button/button.svelte';
	import Icon from '@iconify/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

	//color is bindable
	let {
		supabase_lt,
		model,
		color = $bindable('#000000'),
		material = $bindable(null),
		quality,
		scale,
		infill,
        walls,
		requestQuoteCompleter
	}: {
		supabase_lt: SupabaseClient;
		model: File | null;
		color: string;
		material: string | null;
		quality: string;
		scale: number;
		infill: number;
        walls : number;
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

	interface Maker {
		maker_id: string;
		crafter_name: string;
		approved_state: string;
		avg_quote_time: number | null;
		avg_rating: number | null;
		completed_orders: number | null;
		contact_number: string;
		price_rank: number;
		delivery_rank: number;
		email: string;
		filaments: Record<
			string,
			Array<{
				color: string;
				material_type: string;
			}>
		>;
		reviews : Array<{
			rating: number;
			comment: string;
			created_at: string;
		}>;
		max_printer_size: string;
		number_of_printers: number;
		tier: string;
	}

	let makers: Maker[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let expandedMaker = $state('');
	let loadingQuote = $state<string>('');
	let uploadProgress = $state<Record<string, number | null>>({});
	let currentUserId = $state('');

	function getIcon(tier: string) {
		const icons = [
			{ icon: 'fluent-emoji-high-contrast:tiger-face', color: '#ffcc33' },
			{ icon: 'fluent-emoji-high-contrast:rhinoceros', color: '#6b9bff' },
			{ icon: 'fluent-emoji-high-contrast:peacock', color: '#33cc99' },
			{ icon: 'fluent-emoji-high-contrast:honeybee', color: '#ffd633' },
			{ icon: 'fluent-emoji-high-contrast:eagle', color: '#5572d9' }
		];
		if (tier === 'Tiger') {
			return icons[0];
		} else if (tier === 'Rhino') {
			return icons[1];
		} else if (tier === 'Peacock') {
			return icons[2];
		} else if (tier === 'Bee') {
			return icons[3];
		} else if (tier === 'Osprey') {
			return icons[4];
		}
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
			toastStore.show('No model selected', 'error');
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
		let selectedMaker = makers.find((maker) => maker.maker_id === maker_id);
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
		// Set loadingQuote via progress callback
		await requestQuoteCompleter(
			maker_id, model, color, material, quality, scale, infill, walls,
			(progress: number | null) => {
				loadingQuote = progress !== null ? maker_id : '';
				uploadProgress = { ...uploadProgress, [maker_id]: progress };
			}
		);
		// Success toast is handled in requestQuoteCompleter
	}

	onMount(async () => {
		loading = true;
		try {
			const { data: user } = await supabase_lt.auth.getUser();
			currentUserId = user.user?.id ?? '';
			const response = await supabase_lt.rpc('get_creator_full_profile');

			if (response.error) {
				error = 'Failed to load makers.';
				loading = false;
				return;
			} else {
				makers = response.data.filter(
					(maker: any) => maker.filaments && maker.filaments.length > 0
				);
				// Group filaments by material_type
				makers.forEach((maker: Maker) => {
					const filamentObj: Record<string, Array<{ color: string; material_type: string }>> = {};

					if (Array.isArray(maker.filaments)) {
						maker.filaments.forEach((filament: any) => {
							if (!filamentObj[filament.material_type]) {
								filamentObj[filament.material_type] = [];
							}
							filamentObj[filament.material_type].push(filament);
						});
						maker.filaments = filamentObj;
					}
				});
			}

			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Error loading makers.';
			loading = false;
		}
	});

	function toggleMaker(id: string) {
		expandedMaker = expandedMaker === id ? '' : id;
	}
</script>

<div
	class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle mb-4 border border-accent/15">
	<div class="text-lg font-medium text-white mb-4 flex items-center">
		<Icon icon="material-symbols:person-pin-circle" class="text-accent mr-2 icon-glow" />
		<span class="glow-text-subtle">Available Makers ({makers.length})</span>
	</div>

	{#if loading}
		<div class="text-center text-white/70 py-8">Loading makers...</div>
	{:else if error}
		<div class="text-center text-red-400 py-8">{error}</div>
	{:else if makers.length === 0}
		<div class="text-center text-white/60 py-8">No makers available right now.</div>
	{:else}
		<div class="space-y-3">
			{#each makers as maker, i}
				{@const icon = getIcon(maker.tier)}
				{@const isSelf = maker.maker_id === currentUserId}
				<div class="bg-black/50 rounded-lg overflow-hidden border border-zinc-800 {isSelf ? 'opacity-50 relative' : ''}">
					<!-- Maker header -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="p-3 flex items-center justify-between cursor-pointer hover:bg-black/70 transition-colors"
						onclick={() => toggleMaker(maker.maker_id)}>
						<div class="flex items-center gap-2">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center"
								style="background-color: {icon!.color}30;">
								<Icon icon={icon!.icon} style="color: {icon!.color}" class="text-lg" />
							</div>
							<div class="font-medium text-white text-lg">{maker.crafter_name}</div>
						</div>
						<div class="flex items-center gap-4">
							{#if maker.reviews?.length > 0}
								<div class="flex items-center gap-1">
									<Icon icon="material-symbols:star" class="text-yellow-400 text-sm" />
									<span class="text-white text-sm">{maker.reviews.reduce((acc, review) => acc + review.rating, 0) / maker.reviews.length} ({maker.reviews.length})</span>
								</div>
							{:else}
								<div class="flex items-center gap-1">
									<Icon icon="material-symbols:star-outline" class="text-white text-sm" />
									<span class="text-white text-sm">unrated</span>
								</div>
							{/if}
							<button class="text-xl text-zinc-400">
								<Icon
									icon={expandedMaker === maker.maker_id
										? 'material-symbols:expand-less'
										: 'material-symbols:expand-more'} />
							</button>
						</div>
						{#if isSelf}
							<div class="absolute top-2 right-2 bg-black/80 text-white text-xs px-3 py-1 rounded shadow-glow-subtle border border-accent/30 z-10">
								You cant order from yourself
							</div>
						{/if}
					</div>

					<!-- Expanded maker details -->
					{#if expandedMaker === maker.maker_id}
						<div class="px-3 pb-3 {isSelf ? 'cursor-not-allowed pointer-events-none' : ''}">
							<div class="flex items-center gap-4 text-xs text-white/70 mb-2 flex-wrap">
								<div class="flex items-center">
									<Icon icon="mdi:printer" class="text-accent mr-1 text-lg" />
									<span
										>{maker.number_of_printers ?? 0} printer{maker.number_of_printers === 1
											? ''
											: 's'}</span>
								</div>
								<div class="flex items-center">
									<Icon
										icon="material-symbols:check-circle-outline"
										class="text-accent mr-1 text-lg" />
									<span
										>{maker.completed_orders ?? 0} completed order{maker.completed_orders === 1
											? ''
											: 's'}</span>
								</div>
							</div>

							<div class="flex flex-wrap items-center gap-y-2 gap-x-2 text-xs text-white/70 mb-2">
								<!-- Max printer size -->
								<div class="flex items-center bg-accent/20 text-accent rounded-sm p-1">
									<!-- Area icon -->
									<Icon icon="material-symbols:resize-rounded" class="text-accent mr-1 text-lg" />
									<span>{maker.max_printer_size ?? 'Unknown'} Max</span>
								</div>
								<!-- Price and delivery rank -->
								<div class="flex items-center bg-green-400/20 rounded-sm p-1 group relative">
									{#each Array(maker.price_rank) as _, i}
										<span class="text-green-600 font-bold">₹</span>
									{/each}
									{#each Array(5 - maker.price_rank) as _, i}
										<span class="text-green-300/20">₹</span>
									{/each}
									<div
										class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-green-900 text-green-400 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
										Affordablity: {maker.price_rank}/5
									</div>
								</div>
								<div class="flex items-center bg-yellow-400/20 rounded-sm p-1 group relative">
									{#each Array(maker.delivery_rank) as _, i}
										<span class="text-yellow-600 font-bold">⚡︎</span>
									{/each}
									{#each Array(5 - maker.delivery_rank) as _, i}
										<span class="text-yellow-300/20">⚡︎</span>
									{/each}
									<div
										class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-yellow-900 text-yellow-400 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
										Delivery Speed: {maker.delivery_rank}/5
									</div>
								</div>
								<!-- Response time-->
								 

								{#if maker.avg_quote_time}
								{@const hh = parseInt(maker.avg_quote_time.toString().split(':')[0])}
								{@const mm = parseInt(maker.avg_quote_time.toString().split(':')[1])}
								{@const ss = parseInt(maker.avg_quote_time.toString().split(':')[2])}
								<div class="flex items-center bg-accent/20 rounded-md px-2 py-1">
									<Icon
										icon="material-symbols:timer-outline"
										class="text-accent mr-1.5 text-lg" />
									<span class="text-accent font-medium">Response time:</span>
									<span class="ml-1 text-white/80">
										{#if hh > 24}
											~{Math.ceil(hh / 24)} days
										{:else if hh > 1}
											~{hh}.{(mm/60).toFixed(1).split('.')[1]} hours
										{:else if mm > 15}
											~{mm}.{(ss/60).toFixed(1).split('.')[1]} minutes
										{:else}
											~15 minutes
										{/if}
									</span>
								</div>
								{/if}
							</div>
							<div class="flex flex-col gap-2 mt-2">
								{#each Object.keys(maker.filaments) as mat}
									<div class="flex gap-1">
										<span
											class="bg-accent/10 text-accent text-sm font-semibold px-2 py-0.5 rounded-lg w-fit"
											>{mat}</span>
										<div class="flex flex-wrap gap-2 ml-2">
											{#each maker.filaments[mat] as filament}
												<!-- show color as a circle -->
												<button
													class="w-6 h-6 rounded-lg border-2 transition-transform duration-200 hover:scale-110 hover:shadow-lg hover:shadow-accent/20 relative {color ===
														filament.color && material === mat
														? 'border-accent scale-110 shadow-lg shadow-accent/20'
														: 'hover:border-white'}"
													onclick={() => {
														color = filament.color;
														material = mat;
													}}
													aria-label={filament.color}>
													<div
														class="w-full h-full rounded-lg"
														style="background-color: {filament.color};">
													</div>
													{#if color === filament.color}
														<div class="absolute inset-0 rounded-lg bg-accent/20 animate-pulse">
														</div>
													{/if}
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>

							<div class="relative w-full mt-4">
								<Button
									class="w-full bg-accent/10 text-accent hover:bg-accent/14 relative"
									disabled={loadingQuote === maker.maker_id}
									onclick={() => {
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
									<span class="relative z-10">
										{#if loadingQuote === maker.maker_id}
											{#if uploadProgress[maker.maker_id] !== null && typeof uploadProgress[maker.maker_id] === 'number'}
												Requesting... {uploadProgress[maker.maker_id]}%
											{:else}
												Requesting...
											{/if}
										{:else}
											Request a quote
										{/if}
									</span>
								</Button>
								{#if loadingQuote === maker.maker_id && uploadProgress[maker.maker_id] !== null && typeof uploadProgress[maker.maker_id] === 'number'}
									<div class="w-full h-1 bg-accent/20 rounded mt-2">
										<div class="h-1 bg-accent rounded" style="width: {uploadProgress[maker.maker_id]}%"></div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
