<script lang="ts">
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Package from '@lucide/svelte/icons/package';
	import { navigating, page } from '$app/state';
	import { PortalCard } from '$lib/components/portal';
	import { MakerRowSkeleton, MetaChip, TagBadge } from '$lib/components/sc';
	import { cn } from '$lib/utils';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { parsePrintModelData } from '$lib/types/printRequest';
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

	function modelDisplayName(modelPath: string | null) {
		if (!modelPath) return 'Model';
		const parts = modelPath.split('/').pop()?.split('.') ?? [];
		if (parts.length < 2) return 'Model';
		const nameParts = parts[parts.length - 2]?.split('_') ?? [];
		return `${nameParts[nameParts.length - 1] ?? 'model'}.${parts[parts.length - 1]}`;
	}

	function stageStyle(stage: string | null) {
		return STAGE_STYLES[String(stage)] ?? STAGE_STYLES.default;
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
			.channel('realtime-chat-global')
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
		<TagBadge label="user_portal" class="mb-3" />
		<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Your Print Requests</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
			Track quotes, chat with makers, and manage every order you've submitted through Fabbly.
		</p>
	</header>

	{#if isLoading}
		<MakerRowSkeleton count={4} />
	{:else if printRequests.length === 0}
		<PortalCard class="py-16 text-center">
			<Package class="mx-auto mb-3 size-8 text-muted-foreground" strokeWidth={1.5} />
			<p class="font-mono text-sm text-foreground">no_requests_yet</p>
			<p class="mt-2 text-sm text-muted-foreground">
				Upload a model on the Fabbly portal to request your first quote.
			</p>
		</PortalCard>
	{:else}
		<div class="space-y-3">
			<div class="flex items-center justify-between gap-4 border-b border-border pb-4">
				<div class="flex items-center gap-2">
					<Package class="size-4 text-muted-foreground" strokeWidth={1.5} />
					<span class="font-mono text-sm text-foreground">print_requests</span>
					<span class="font-mono text-xs text-muted-foreground">({printRequests.length})</span>
				</div>
			</div>

			<ul class="flex flex-col gap-3">
				{#each printRequests as req (req.id)}
					{@const modelData = parsePrintModelData(req.model_data)}
					<li>
						<a
							href={`/3dp-portal/user/${req.id}`}
							class="group block rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-muted/20">
							<div class="mb-3 flex items-start justify-between gap-4">
								<div class="min-w-0">
									<div class="truncate font-medium text-foreground group-hover:text-foreground">
										{modelDisplayName(req.model)}
									</div>
									<p class="mt-1 font-mono text-xs text-muted-foreground">
										{new Date(req.created_at).toLocaleString()}
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-2">
									{#if unreadCounts[req.id] > 0}
										<span
											class="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive px-2 py-0.5 font-mono text-xs text-destructive-foreground">
											<MessageSquare class="size-3" strokeWidth={2} />
											{unreadCounts[req.id]}
										</span>
									{/if}
									<span
										class={cn(
											'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs capitalize',
											stageStyle(req.request_stage)
										)}>
										{req.request_stage?.replaceAll('_', ' ') ?? 'pending'}
									</span>
								</div>
							</div>

							<div class="flex flex-wrap gap-1.5">
								<MetaChip>material: {modelData.material}</MetaChip>
								<MetaChip>
									<span class="inline-flex items-center gap-1.5">
										color:
										<span
											class="inline-block size-3 rounded-sm border border-border"
											style={`background-color:${modelData.color}`}></span>
									</span>
								</MetaChip>
								<MetaChip tone="muted">quality: {modelData.quality}</MetaChip>
								<MetaChip tone="muted">scale: {modelData.scale}x</MetaChip>
								<MetaChip tone="muted">infill: {modelData.infill}%</MetaChip>
								<MetaChip tone="muted">walls: {modelData.walls}</MetaChip>
								{#if req.creator_id && data.makerNames?.[req.creator_id]}
									<MetaChip tone="muted">maker: {data.makerNames[req.creator_id]}</MetaChip>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
