<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import { PortalCard } from '$lib/components/portal';
	import { MakerRowSkeleton, MetaChip, ScButton } from '$lib/components/sc';
	import { cn } from '$lib/utils';
	import { formatDateTime, formatInr } from '$lib/utils/format';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import {
		asPrintRequest,
		getPrintRequestDisplayName,
		parsePrintModelData,
		printStageLabel
	} from '$lib/types/printRequest';
	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	const printRequests = data.printRequests;

	const isLoading = $derived(page.url.pathname === '/3dp-portal/user' && !!navigating.to);

	const STAGE_STYLES: Record<string, string> = {
		cancelled: 'border-destructive/30 bg-destructive/5 text-destructive',
		requested: 'border-border bg-muted/40 text-foreground',
		quoted: 'border-border bg-muted/40 text-foreground',
		actionable: 'border-foreground/20 bg-foreground/5 text-foreground',
		paid: 'border-border bg-muted text-foreground',
		paid_externally: 'border-border bg-muted text-foreground',
		completed: 'border-border bg-muted/30 text-muted-foreground',
		'in dispute': 'border-warning/30 bg-warning/5 text-warning',
		default: 'border-border bg-muted/40 text-muted-foreground'
	};

	let unreadCounts: Record<string, number> = $state({});

	function modelDisplayName(modelPath: string | null, modelMetadata: unknown) {
		return getPrintRequestDisplayName(modelPath, modelMetadata as never);
	}

	function stageStyle(stage: string | null) {
		return STAGE_STYLES[String(stage)] ?? STAGE_STYLES.default;
	}

	/** Latest quoted amount from the request's events, if any. */
	function latestQuoteAmount(raw: unknown): number | null {
		const request = asPrintRequest(raw);
		const quoted = request?.events
			.filter((event) => event.type === 'quoted')
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
		const amount = Number(quoted?.extra?.quote);
		return Number.isFinite(amount) && amount > 0 ? amount : null;
	}

	/** One line on whose turn it is, so the list says what to do next. */
	function nextStep(stage: string | null, quote: number | null): string | null {
		switch (stage) {
			case 'requested':
				return 'Waiting for the maker to quote';
			case 'quoted':
				return quote != null
					? `Quote: ${formatInr(quote)}. Waiting for you to pay`
					: 'Waiting for you to pay';
			case 'paid':
			case 'paid_externally':
				return 'Waiting for the maker to ship';
			case 'shipped':
				return 'On its way. Mark it as delivered when it arrives';
			default:
				return null;
		}
	}

	$effect(() => {
		(async () => {
			if (!data.session?.data?.user?.id) return;
			const orderIds: string[] = printRequests.map((r) => r.id);
			if (orderIds.length === 0) return;
			const { data: unread, error } = await supabase()
				.from('Chat')
				.select('relationship_id')
				.in('relationship_id', orderIds)
				.eq('recipient_id', data.session.data.user.id)
				.eq('status', 'sent');
			if (error) return;
			const counts: Record<string, number> = {};
			for (const row of unread ?? []) {
				counts[row.relationship_id] = (counts[row.relationship_id] || 0) + 1;
			}
			unreadCounts = counts;
		})();
	});

	$effect(() => {
		if (!data.session?.data?.user?.id) return;
		const chatSubscription = supabase()
			.channel(`user-portal-chat:${data.session.data.user.id}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'Chat',
					filter: `recipient_id=eq.${data.session.data.user.id}`
				},
				(payload) => {
					unreadCounts[payload.new.relationship_id] =
						(unreadCounts[payload.new.relationship_id] || 0) + 1;
				}
			)
			.subscribe();
		return () => {
			supabase().removeChannel(chatSubscription);
		};
	});
</script>

<div class="mx-auto max-w-7xl px-4 pb-16">
	<header class="mb-8 border-b border-border pb-8">
		<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">My print requests</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
			Track quotes, message makers and follow your 3D printing orders.
		</p>
	</header>

	{#if isLoading}
		<MakerRowSkeleton count={4} />
	{:else if data.error}
		<PortalCard class="py-16 text-center">
			<p class="text-sm text-destructive" role="alert">
				Couldn't load your print requests. Refresh to try again.
			</p>
		</PortalCard>
	{:else if printRequests.length === 0}
		<PortalCard class="py-16 text-center">
			<Icon icon={F.box} class="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
			<p class="text-sm font-medium text-foreground">No print requests yet</p>
			<p class="mt-2 text-sm text-muted-foreground">Upload a model to request your first quote.</p>
			<div class="mt-4">
				<ScButton href="/3dp-portal">Upload a model</ScButton>
			</div>
		</PortalCard>
	{:else}
		<div class="space-y-3">
			<div class="flex items-center justify-between gap-4 border-b border-border pb-4">
				<div class="flex items-center gap-2">
					<Icon icon={F.box} class="size-4 text-muted-foreground" aria-hidden="true" />
					<span class="text-sm font-medium text-foreground">Print requests</span>
					<span class="text-sm text-muted-foreground">({printRequests.length})</span>
				</div>
			</div>

			<ul class="flex flex-col gap-3">
				{#each printRequests as req (req.id)}
					{@const modelData = parsePrintModelData(req.model_data)}
					{@const step = nextStep(req.request_stage, latestQuoteAmount(req))}
					<li>
						<a
							href={resolve('/3dp-portal/(authenticated)/user/[id]', { id: req.id })}
							class="group block rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-muted/20">
							<div class="mb-3 flex items-start justify-between gap-4">
								<div class="min-w-0">
									<div class="truncate font-medium text-foreground group-hover:text-foreground">
										{modelDisplayName(req.model, req.model_metadata)}
									</div>
									<p class="mt-1 text-xs text-muted-foreground">
										{formatDateTime(req.created_at)}
									</p>
									{#if step}
										<p class="mt-1 text-sm text-foreground">{step}</p>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-2">
									{#if unreadCounts[req.id] > 0}
										<span
											class="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive px-2 py-0.5 text-xs text-destructive-foreground"
											aria-label="{unreadCounts[req.id]} unread messages">
											<Icon icon={F.chat} class="size-3" aria-hidden="true" />
											{unreadCounts[req.id]}
										</span>
									{/if}
									<span
										class={cn(
											'inline-flex items-center rounded-md border px-2 py-0.5 text-xs',
											stageStyle(req.request_stage)
										)}>
										{printStageLabel(req.request_stage)}
									</span>
								</div>
							</div>

							<div class="flex flex-wrap gap-1.5">
								<MetaChip>Material: {modelData.material}</MetaChip>
								<MetaChip>
									<span class="inline-flex items-center gap-1.5">
										Colour
										<span
											class="inline-block size-3 rounded-sm border border-border"
											style={`background-color:${modelData.color}`}></span>
									</span>
								</MetaChip>
								<MetaChip tone="muted">Quality: {modelData.quality}</MetaChip>
								<MetaChip tone="muted">Scale: {modelData.scale}x</MetaChip>
								<MetaChip tone="muted">Infill: {modelData.infill}%</MetaChip>
								{#if modelData.walls != null}
									<MetaChip tone="muted">Walls: {modelData.walls}</MetaChip>
								{/if}
								{#if req.creator_id && data.makerNames?.[req.creator_id]}
									<MetaChip tone="muted">Maker: {data.makerNames[req.creator_id]}</MetaChip>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
