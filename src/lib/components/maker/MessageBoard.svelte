<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onMount, onDestroy, tick } from 'svelte';
	import { Filter } from 'bad-words';
	import { toastStore } from '$lib/client/toastStore';

	let {
		orderId,
		supabase_lt,
		session,
		receiverId,
		disabled,
		paynow
	}: {
		orderId: string;
		supabase_lt: SupabaseClient;
		session: { data: { user: { id: string } } } | null;
		receiverId: string;
		disabled: boolean;
		paynow?: () => void;
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
	let initialLoadCompleted = $state(false);

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
		if (!initial && loadingMore) return; // Prevent concurrent "load more" calls

		if (initial) {
			loading = true; // Show "Loading messages..." text
		}
		loadingMore = true; // Indicate an active fetch operation

		if (initial) {
			page = 0;
			hasMore = true;
			messages = []; // Clear messages for initial load
		}

		const from = page * pageSize;
		const to = from + pageSize - 1;

		let previousScrollHeight = 0;
		let previousScrollTop = 0;

		if (!initial && scrollContainer) {
			previousScrollHeight = scrollContainer.scrollHeight;
			previousScrollTop = scrollContainer.scrollTop;
		}

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
			if (initial) messages = []; // Ensure messages is empty on initial fetch error
		} else {
			const newMessagesData = (data || []).reverse();
			if (initial) {
				messages = newMessagesData;
			} else {
				if (newMessagesData.length > 0) {
					messages = [...newMessagesData, ...messages];
				}
			}
			hasMore = (data?.length || 0) === pageSize;
		}

		await tick(); // Wait for Svelte to update the DOM with new messages

		if (initial) {
			loading = false; // Set loading to false; the $effect will handle the scroll
			// We can keep the tick if other logic might depend on it, or remove if solely for the removed scroll
			await tick();
		} else {
			// Only adjust scroll if new messages were actually added and scrollContainer exists
			if (scrollContainer && data && data.length > 0) {
				const currentScrollHeight = scrollContainer.scrollHeight;
				scrollContainer.scrollTop =
					previousScrollTop + (currentScrollHeight - previousScrollHeight);
			}
		}
		loadingMore = false; // Fetch operation complete
	}

	$effect(() => {
		// Handles the very first scroll to bottom after initial messages are loaded.
		if (
			!initialLoadCompleted &&
			!loading &&
			messages.length > 0 &&
			scrollContainer &&
			!loadingMore
		) {
			// Ensure all conditions are met:
			// - Initial load hasn't completed its scroll yet.
			// - Main loading indicator is off.
			// - Messages are present.
			// - Scroll container exists.
			// - The "loadingMore" phase (entire fetchMessages async op) is also complete.
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
			initialLoadCompleted = true; // Prevent this from running again
		}
	});

	function handleScroll() {
		if (!scrollContainer) return;
		if (scrollContainer.scrollTop < 50 && hasMore && !loadingMore) {
			page += 1;
			fetchMessages(false);
		}
	}

	// Removed the problematic $effect that unconditionally scrolled to bottom

	$effect(() => {
		// Only scroll to bottom if a new message is added at the end (appended)
		// and not during a "load more" operation (which fetchMessages handles).
		if (scrollContainer && messages.length > prevMessageCount && !loadingMore) {
			const lastMessage = messages[messages.length - 1];
			const secondLastMessage = messages[messages.length - 2]; // Could be undefined if messages.length < 2

			// Condition to check if a new message was truly appended and is the latest
			if (
				(messages.length === 1 && prevMessageCount === 0) || // It's the very first message
				(prevMessageCount > 0 && // There were previous messages
					lastMessage && // The last message exists
					(!secondLastMessage || // Either there's no second to last (meaning one was added to a list of 1)
						new Date(lastMessage.created_at).getTime() >
							new Date(secondLastMessage.created_at).getTime())) // Or it's newer
			) {
				const isOwnMessage = lastMessage?.sender_id === session?.data?.user?.id;
				// Check if scroll container is scrolled near the bottom (e.g., within 100px)
				const nearBottom =
					scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight <
					100;

				if (isOwnMessage || nearBottom) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			}
		}
		prevMessageCount = messages.length;
	});

	// Debounce chat read updates
	let newChatIds = $state<string[]>([]);
	let debounceChatReadTimer: NodeJS.Timeout | null = null;
	$effect(() => {
		if (newChatIds.length > 0) {
			if (debounceChatReadTimer) {
				clearTimeout(debounceChatReadTimer);
			}
			debounceChatReadTimer = setTimeout(() => {
				supabase_lt
					.from('Chat')
					.update({ status: 'read' })
					.eq('relationship_id', orderId)
					.in('chat_id', newChatIds)
					.eq('status', 'sent')
					.then(() => {});
				newChatIds = [];
			}, 1500);
		}
	});

	// Subscribe to realtime updates
	function subscribeToMessages() {
		subscription = supabase_lt
			.channel('realtime-chat-channel')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'Chat', filter: `relationship_id=eq.${orderId}` }, //might need to change to filter: `relationship_id=eq.${orderId}`
				(payload) => {
					if (payload.eventType === 'INSERT') {
						messages = [...messages, payload.new];
						//mark message as read
						//TODO: debounce multiple updates.
						newChatIds.push(payload.new.chat_id);
					}
					if (payload.eventType === 'UPDATE') {
						messages = messages.map((msg) => {
							if (msg.chat_id === payload.new.chat_id) return payload.new;
							return msg;
						});
					}
				}
			)
			.subscribe();
	}

	onMount(() => {
		fetchMessages(true);
		subscribeToMessages();
		// Mark all messages as read for this order
		if (session?.data?.user?.id) {
			supabase_lt
				.from('Chat')
				.update({ status: 'read' })
				.eq('relationship_id', orderId)
				.eq('recipient_id', session.data.user.id)
				.eq('status', 'sent')
				.then((res) => {});
		}
		return () => {
			if (subscription) supabase_lt.removeChannel(subscription);
		};
	});

	async function sendMessage(e: Event) {
		e.preventDefault();
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
		if (sendError) {
			toastStore.show(`Unable to send message: ${sendError.message}`, 'error');
		}
	}

	$effect(() => {
		if (session?.data?.user?.id && messages.length > 0) {
			// Find messages sent to the current user that are still 'sent'
			const unread = messages.filter(
				(msg) => msg.recipient_id === session.data.user.id && msg.status === 'sent'
			);
			if (unread.length > 0) {
				supabase_lt
					.from('Chat')
					.update({ status: 'read' })
					.eq('relationship_id', orderId)
					.eq('recipient_id', session.data.user.id)
					.eq('status', 'sent');
			}
		}
	});
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
	</div>
	<div class="flex flex-1 relative">
		<div
			class="absolute inset-0 flex-1 flex flex-col bg-accent/7 rounded-lg p-4 overflow-y-auto"
			bind:this={scrollContainer}
			onscroll={handleScroll}>
			<div class="text-xs text-gray-400 mb-2 flex items-center gap-1">
				<Icon icon="ph:info-duotone" class="text-yellow-500" />
				<span
					>File sharing is not available due to hosting costs. We apologize for any inconvenience.</span>
			</div>
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
								<span class="bg-accent-dark/20 text-xs text-gray-200 px-3 py-1 rounded-full">
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
								{#if actionObj.action === 'shipped'}
									{@const shippedObj = JSON.parse(msg.message)}
									<div
										class="px-4 py-3 rounded-lg max-w-xs break-words bg-gradient-to-br from-amber-500/20 to-yellow-500/30 border border-yellow-400/70 text-yellow-100 shadow-lg backdrop-blur-sm {msg.sender_id ===
										session?.data?.user?.id
											? 'self-end'
											: 'self-start'} flex flex-col items-start">
										<div class="font-semibold text-sm flex items-center gap-2">
											<div class="bg-yellow-400/30 p-1.5 rounded-full">
												<Icon icon="ph:truck-bold" class="text-lg text-yellow-200" />
											</div>
											<span class="text-yellow-50">Shipped via {shippedObj.courier}</span>
										</div>
										{#if shippedObj.tracking_id}
											<div class="text-sm mt-2 bg-black/20 px-3 py-1.5 rounded-md w-full">
												<span class="font-medium text-yellow-200">Tracking ID:</span>
												<span class="ml-1">{shippedObj.tracking_id}</span>
											</div>
										{/if}
										{#if shippedObj.tracking_link}
											<div class="text-sm mt-2 w-full">
												<a
													href={shippedObj.tracking_link}
													target="_blank"
													class="flex items-center justify-center gap-1 bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-50 px-3 py-2 rounded-md w-full transition-all duration-200 border border-yellow-400/50 hover:border-yellow-400">
													<Icon icon="ph:package-bold" class="text-lg" />
													Track your package
													<Icon icon="ph:arrow-up-right-bold" class="text-xs" />
												</a>
											</div>
										{/if}
										{#if shippedObj.reason}
											<div class="text-xs mt-2 text-yellow-200/70 bg-black/10 px-2 py-1 rounded w-full">{shippedObj.reason}</div>
										{/if}
									</div>
								{:else}
									<div
										class="px-3 py-2 rounded-lg max-w-xs break-words bg-red-500/20 border border-red-400 text-red-200 {msg.sender_id ===
										session?.data?.user?.id
											? 'self-end'
											: 'self-start'} flex flex-col items-center">
										<div class="font-semibold text-sm w-full flex items-start gap-1">
											<Icon icon="ph:warning-circle-bold" class="text-lg" />
											{actionObj?.action
												? actionObj.action.charAt(0).toUpperCase() + actionObj.action.slice(1)
												: 'Action'}
										</div>
										{#if actionObj?.reason}
											<div class="text-sm mt-1 text-red-200 flex flex-col">
												<span class="opacity-50">Reason </span> <span>{actionObj.reason}</span>
											</div>
										{/if}
									</div>
								{/if}
							{:else if msg.message_type === 'quote'}
								{@const actionObj = JSON.parse(msg.message)}
								<div
									class="px-3 py-2 rounded-lg max-w-xs break-words bg-blue-500/20 border border-blue-400 text-blue-200 {msg.sender_id ===
									session?.data?.user?.id
										? 'self-end'
										: 'self-start'} flex flex-col items-start">
									<div class="font-semibold text-sm flex items-center gap-1">
										<Icon icon="ph:warning-circle-bold" class="text-lg" />
										{msg.sender_id === session?.data?.user?.id ? 'Quote Sent' : 'Quote Received'}
									</div>
									<div class="text-sm text-blue-200">{actionObj.reason}</div>
									<div class="text-2xl font-semibold mt-1 text-blue-200">{actionObj.quote}₹</div>
									<!-- show a button to accept the quote only for the latest quote message for the current user -->
									{#if msg.recipient_id === session?.data?.user?.id && (() => {
											// Find the last quote message for the current user
											let lastIndex = -1;
											for (let j = messages.length - 1; j >= 0; j--) {
												if (messages[j].message_type === 'quote' && messages[j].recipient_id === session?.data?.user?.id) {
													lastIndex = j;
													break;
												}
											}
											return i === lastIndex;
										})()}
										<button
											class="bg-blue-500/20 text-blue-200 px-3 py-2 rounded-lg text-sm mt-2 w-full hover:bg-blue-500/50 transition-colors duration-200"
											onclick={paynow
												? () => {
														paynow();
													}
												: () => {
														toastStore.show(
															'Close the chat, select address and click pay now',
															'info'
														);
													}}>Pay Now</button>
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
							<div class="flex gap-x-0.5 mt-1">
								{#if msg.sender_id === session?.data?.user?.id}
									<div class="text-xs text-right">
										<span class={msg.status === 'read' ? 'text-green-400' : 'text-gray-400'}>
											<Icon
												icon={msg.status === 'read' ? 'mdi:check-all' : 'mdi:check'}
												class="w-3 h-3" />
										</span>
									</div>
								{/if}
								<div
									class="text-xs text-gray-500 {msg.sender_id === session?.data?.user?.id
										? 'text-right'
										: ''}">
									{new Date(msg.created_at).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	<!-- send message form-->
	<div class="border-t border-gray-700/50 p-4 h-fit">
		<form class="flex items-center gap-2 bg-accent/7 rounded-lg px-4 py-2" onsubmit={sendMessage}>
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
