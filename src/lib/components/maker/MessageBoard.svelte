<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onMount, onDestroy } from 'svelte';
	import { Filter } from 'bad-words';

	let {
		orderId,
		supabase_lt,
		session,
		receiverId,
		disabled
	}: {
		orderId: string;
		supabase_lt: SupabaseClient;
		session: { data: { user: { id: string } } } | null;
		receiverId: string;
		disabled: boolean;
	} = $props();

	let messages = $state<any[]>([]);
	let newMessage = $state('');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let subscription: any = null;
	let scrollContainer: HTMLDivElement | null = null;
	let page = $state(0);
	let pageSize = 15;
	let hasMore = $state(true);
	let loadingMore = $state(false);
	const filter = new Filter();
	filter.removeWords('shit', 'damn', 'sadist');
	let prevMessageCount = $state(0);

	function getDateLabel(dateStr: string) {
		const date = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		const msgDate = new Date(date);
		msgDate.setHours(0, 0, 0, 0);
		if (msgDate.getTime() === today.getTime()) return 'Today';
		if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
		return date.toLocaleDateString();
	}

	async function fetchMessages(initial = false) {
		if (loadingMore) return;
		loadingMore = true;
		if (initial) {
			page = 0;
			hasMore = true;
		}
		const from = page * pageSize;
		const to = from + pageSize - 1;
		const {
			data,
			error: fetchError,
			count
		} = await supabase_lt
			.from('Chat')
			.select('*', { count: 'exact' })
			.eq('relationship_id', orderId)
			.order('created_at', { ascending: false })
			.range(from, to);
		if (fetchError) {
			error = fetchError.message;
			if (initial) messages = [];
		} else {
			if (initial) {
				messages = (data || []).reverse();
			} else {
				messages = [...(data || []).reverse(), ...messages];
			}
			hasMore = (data?.length || 0) === pageSize;
		}
		loading = false;
		loadingMore = false;
	}

	function handleScroll() {
		if (!scrollContainer) return;
		if (scrollContainer.scrollTop < 50 && hasMore && !loadingMore) {
			page += 1;
			fetchMessages(false);
		}
	}

	$effect(() => {
		if (scrollContainer && !loadingMore) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	});

	$effect(() => {
		// Only scroll to bottom if a new message is added at the end
		if (scrollContainer && messages.length > prevMessageCount) {
			// Check if the last message is newer than the previous last message
			if (
				messages.length === 1 ||
				(prevMessageCount > 0 &&
					messages[messages.length - 1]?.created_at > messages[messages.length - 2]?.created_at)
			) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
		prevMessageCount = messages.length;
	});

	// Subscribe to realtime updates
	function subscribeToMessages() {
		console.log('subscribing to messages');
		subscription = supabase_lt
			.channel('realtime-chat-channel')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'Chat', filter: `relationship_id=eq.${orderId}` }, //might need to change to filter: `relationship_id=eq.${orderId}`
				(payload) => {
					console.log('payload', payload);
					if (payload.eventType === 'INSERT') {
						messages = [...messages, payload.new];
					}
				}
			)
			.subscribe();
	}

	onMount(() => {
		fetchMessages(true);
		subscribeToMessages();
		return () => {
			if (subscription) supabase_lt.removeChannel(subscription);
		};
	});

	async function sendMessage(e: Event) {
		e.preventDefault();
		console.log('sending message', newMessage);
		console.log('session', session);
		if (!newMessage.trim() || !session?.data?.user?.id) return;
		const { error: sendError } = await supabase_lt.from('Chat').insert([
			{
				sender_id: session.data.user.id,
				recipient_id: receiverId, // set if you know the recipient
				message: newMessage,
				relationship_id: orderId,
				message_type: 'text',
				status: 'sent'
			}
		]);
		if (!sendError) {
			newMessage = '';
		}
	}
</script>

<div class="relative h-full flex flex-col">
	{#if disabled}
		<div
			class="absolute inset-0 bg-[#101010]/70 z-10 flex items-center justify-center cursor-not-allowed rounded-lg">
			<span class="text-gray-400 text-lg font-semibold">Chat Disabled</span>
		</div>
	{/if}
	<div class="flex flex-col gap-1 pl-4 pb-2">
		<span class="text-xs text-gray-400">Message Board</span>
		<div class="text-xs text-gray-400 mb-2 flex items-center gap-1">
			<Icon icon="ph:info-duotone" class="text-yellow-500" />
			<span
				>File sharing is not available due to hosting costs. We apologize for any inconvenience.</span>
		</div>
	</div>
	<div
		class="flex flex-1 flex-col bg-gray-900/50 rounded-lg p-4 h-full overflow-y-auto"
		bind:this={scrollContainer}
		onscroll={handleScroll}>
		{#if loading}
			<div class="text-gray-400 text-center py-4">Loading messages...</div>
		{:else if error}
			<div class="text-red-400 text-center py-4">{error}</div>
		{:else if messages.length === 0}
			<div class="text-gray-400 text-center py-4">No messages yet.</div>
		{:else}
			<div class="flex-1 space-y-4">
				{#each messages as msg, i}
					{#if i === 0 || getDateLabel(msg.created_at) !== getDateLabel(messages[i - 1].created_at)}
						<div class="flex justify-center my-2">
							<span class="bg-gray-700 text-xs text-gray-200 px-3 py-1 rounded-full">
								{getDateLabel(msg.created_at)}
							</span>
						</div>
					{/if}
					<div
						class="flex flex-col {msg.sender_id === session?.data?.user?.id
							? 'items-end'
							: 'items-start'}">
						{#if msg.message_type === 'action'}
							{@const actionObj = JSON.parse(msg.message)}
							<div
								class="px-3 py-2 rounded-lg max-w-xs break-words bg-red-500/20 border border-red-400  text-red-200 {msg.sender_id === session?.data?.user?.id ? 'self-end' : 'self-start'} flex flex-col items-center ">
								<div class="font-semibold text-sm flex items-center gap-1">
									<Icon icon="ph:warning-circle-bold" class="text-lg" />
									{actionObj?.action
										? actionObj.action.charAt(0).toUpperCase() + actionObj.action.slice(1)
										: 'Action'}
								</div>
								{#if actionObj?.reason}
									<div class="text-xs mt-1 text-red-200 italic">Reason: {actionObj.reason}</div>
								{/if}
							</div>
						{:else}
							<div
								class="px-3 py-2 rounded-lg max-w-xs break-words {msg.sender_id ===
								session?.data?.user?.id
									? 'bg-sky-400/65 text-white self-end'
									: 'bg-gray-800 text-gray-100 self-start'}">
								{@html filter.clean(msg.message)}
							</div>
						{/if}
						<div
							class="text-xs text-gray-500 mt-1 {msg.sender_id === session?.data?.user?.id
								? 'text-right'
								: ''}">
							{new Date(msg.created_at).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div class="border-t border-gray-700/50 p-4">
		<form
			class="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2"
			onsubmit={sendMessage}>
			<input
				type="text"
				class="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
				placeholder="Type your message..."
				bind:value={newMessage}
				{disabled} />
			<button
				class="text-accent hover:text-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				type="submit"
				{disabled}>
				<Icon icon="ph:paper-plane-right-bold" class="text-xl" />
			</button>
		</form>
	</div>
</div>
