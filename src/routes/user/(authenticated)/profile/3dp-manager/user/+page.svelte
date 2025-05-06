<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { mod } from 'three/tsl';

  let { data } = $props();
  const printRequests = data.printRequests;

  
	const STAGES = [
		'cancelled',
		'requested',
		'quoted',
		'actionable',
		'paid',
		'paid_externally',
		'completed',
		'in dispute'
	];

	const STAGE_COLORS: Record<string, string> = {
		cancelled: 'bg-red-500/10 text-red-400 border-red-400/20',
		requested: 'bg-accent/10 text-accent border-accent/20',
		quoted: 'bg-purple-500/10 text-purple-400 border-purple-400/20',
		actionable: 'bg-orange-500/10 text-orange-400 border-orange-400/20',
		paid: 'bg-green-500/10 text-green-400 border-green-400/20',
		paid_externally: 'bg-green-500/10 text-green-400 border-green-400/20',
		completed: 'bg-gray-500/10 text-gray-300 border-gray-400/20',
		'in dispute': 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
		default: 'bg-accent/10 text-accent border-accent/10'
	};

	let unreadCounts: Record<string, number> = $state({});
	$effect(() => {
		(async () => {
			if (!data.session?.data?.user?.id) return;
			const orderIds: string[] = printRequests.map(r => r.id);
			if (orderIds.length === 0) return;
			const { data: unread, error } = await data.supabase_lt
				.from('Chat')
				.select('relationship_id')
				.in('relationship_id', orderIds)
				.eq('recipient_id', data.session.data.user.id)
				.eq('status', 'sent');
			if (error) return;
			const counts: Record<string, number> = {};
			for (const row of unread) {
				counts[row.relationship_id] = (counts[row.relationship_id] || 0) + 1;
			}
			unreadCounts = counts;
		})();
	});

  onMount(() => {
    //track unread counts by subscribing to the chat channel
    if (!data.session?.data?.user?.id) return;
    const chatSubscription = data.supabase_lt
      .channel('realtime-chat-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Chat', filter: `recipient_id=eq.${data.session.data.user.id}` }, (payload) => {
        //update unread counts
        unreadCounts[payload.new.relationship_id] = (unreadCounts[payload.new.relationship_id] || 0) + 1;
      }).subscribe();
    return () => {
      data.supabase_lt.removeChannel(chatSubscription);
    };
  });

</script>

<div class="p-2 sm:p-4 max-w-4xl mx-auto">
  <div class="text-xl font-semibold mb-4 text-accent/50 ml-8">Your Print Requests</div>
  {#if printRequests.length === 0}
    <div class="text-gray-400 text-center py-12">No print requests yet.</div>
  {:else}
    <ul class="flex flex-col gap-3">
      {#each printRequests as req}
        {@const modelName = req.model?.split('/').pop().split('.')}
        {@const modelName2 = modelName[modelName.length - 2].split('_')}
        <li>
          <a href={`/user/profile/3dp-manager/user/${req.id}`} class="block bg-accent/4 hover:bg-accent/8 rounded-lg p-4 shadow-glow-subtle border border-accent/10 hover:border-accent/40 transition-all">
            <div class="flex items-center justify-between mb-1">
              <div class="font-semibold text-white truncate max-w-[60%]">{modelName ? `${modelName2[modelName2.length - 1]}.${modelName[modelName.length - 1]}` : 'Model'}</div>
              <div class="flex gap-x-2">
                {#if unreadCounts[req.id] > 0}
                  <span class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                    <Icon icon="mdi:chat" class="w-3 h-3 mr-1" />
                    {unreadCounts[req.id]}
                  </span>
                {/if}
                <span class={`text-xs px-2 py-0.5 rounded font-medium border ${STAGE_COLORS[String(req.request_stage)] || STAGE_COLORS.default}`}>{req.request_stage ?? 'pending'}</span>
              </div>
            </div>
            <div class="text-xs text-gray-400 mb-2">{new Date(req.created_at).toLocaleString()}</div>
            <div class="flex flex-wrap gap-2 text-xs text-white/80">
              <span class="bg-accent/10 px-2 py-0.5 rounded">Material: {req.material}</span>
              <!-- show color in a rounded cube-->
              <span class="bg-accent/10 px-2 py-0.5 rounded flex items-center gap-1.5">Color: <div class="w-3 h-3 rounded-sm" style={`background-color:${req.model_data.color}`}></div></span>
              <span class="bg-accent/10 px-2 py-0.5 rounded">Quality: {req.model_data.quality}</span>
              <span class="bg-accent/10 px-2 py-0.5 rounded">Scale: {req.model_data.scale}x</span>
              <span class="bg-accent/10 px-2 py-0.5 rounded">Infill: {req.model_data.infill}%</span>
              <span class="bg-accent/10 px-2 py-0.5 rounded">Walls: {req.model_data.walls}</span>
              {#await data.supabase_lt.from('PrintingCrafters').select('name').eq('maker_id', req.creator_id).single() then dataRes}
                {#if dataRes.data?.name}
                  <span class="bg-accent/10 px-2 py-0.5 rounded">Maker: {dataRes.data.name}</span>
                {/if}
              {/await}
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>