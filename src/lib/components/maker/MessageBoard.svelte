<script lang="ts">
	import { F } from '$lib/icons/fluent';

	import Icon from '@iconify/svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import type { TypedSupabaseClient } from '$lib/types/database';
	import type { ChatMessage } from '$lib/types/chat';
	import { onMount, tick } from 'svelte';
	import { Filter } from 'bad-words';
	import { sendChatMessage } from '$lib/client/portalApi';
	import { toastStore } from '$lib/client/toastStore';
	import { PortalSectionLabel } from '$lib/components/portal';
	import { MessageBubbleSkeleton, ScButton } from '$lib/components/sc';
	import { cn } from '$lib/utils';
	import { formatInr } from '$lib/utils/format';

	let {
		orderId,
		supabase,
		session,
		receiverId,
		disabled,
		paynow
	}: {
		orderId: string;
		supabase: TypedSupabaseClient;
		session: { data: { user: { id: string } | null } } | null;
		receiverId: string;
		disabled: boolean;
		paynow?: () => void;
	} = $props();

	let messages = $state<ChatMessage[]>([]);
	let newMessage = $state('');
	let sending = $state(false);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let subscription: RealtimeChannel | null = null;
	let scrollContainer: HTMLDivElement | null = $state(null);
	let page = $state(0);
	let pageSize = 15;
	let hasMore = $state(true);
	let loadingMore = $state(false);
	const filter = new Filter();
	filter.removeWords('shit', 'damn', 'sadist');
	let prevMessageCount = $state(0);
	let initialLoadCompleted = $state(false);

	/* eslint-disable svelte/prefer-svelte-reactivity -- local, non-reactive date maths */
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
		/* eslint-enable svelte/prefer-svelte-reactivity */
		return date.toLocaleDateString();
	}

	async function fetchMessages(initial = false) {
		if (!initial && loadingMore) return;

		if (initial) {
			loading = true;
		}
		loadingMore = true;

		if (initial) {
			page = 0;
			hasMore = true;
			messages = [];
		}

		const from = page * pageSize;
		const to = from + pageSize - 1;

		let previousScrollHeight = 0;
		let previousScrollTop = 0;

		if (!initial && scrollContainer) {
			previousScrollHeight = scrollContainer.scrollHeight;
			previousScrollTop = scrollContainer.scrollTop;
		}

		const { data, error: fetchError } = await supabase
			.from('Chat')
			.select('*', { count: 'exact' })
			.eq('relationship_id', orderId)
			.order('created_at', { ascending: false })
			.range(from, to);

		if (fetchError) {
			error = fetchError.message;
			if (initial) messages = [];
		} else {
			const newMessagesData = (data || []).reverse();
			if (initial) {
				messages = newMessagesData;
			} else if (newMessagesData.length > 0) {
				messages = [...newMessagesData, ...messages];
			}
			hasMore = (data?.length || 0) === pageSize;
		}

		await tick();

		if (initial) {
			loading = false;
			await tick();
		} else if (scrollContainer && data && data.length > 0) {
			const currentScrollHeight = scrollContainer.scrollHeight;
			scrollContainer.scrollTop = previousScrollTop + (currentScrollHeight - previousScrollHeight);
		}
		loadingMore = false;
	}

	$effect(() => {
		if (
			!initialLoadCompleted &&
			!loading &&
			messages.length > 0 &&
			scrollContainer &&
			!loadingMore
		) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
			initialLoadCompleted = true;
		}
	});

	function handleScroll() {
		if (!scrollContainer) return;
		if (scrollContainer.scrollTop < 50 && hasMore && !loadingMore) {
			page += 1;
			fetchMessages(false);
		}
	}

	$effect(() => {
		if (scrollContainer && messages.length > prevMessageCount && !loadingMore) {
			const lastMessage = messages[messages.length - 1];
			const secondLastMessage = messages[messages.length - 2];

			if (
				(messages.length === 1 && prevMessageCount === 0) ||
				(prevMessageCount > 0 &&
					lastMessage &&
					(!secondLastMessage ||
						new Date(lastMessage.created_at).getTime() >
							new Date(secondLastMessage.created_at).getTime()))
			) {
				const isOwnMessage = lastMessage?.sender_id === session?.data?.user?.id;
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

	let newChatIds = $state<string[]>([]);
	let debounceChatReadTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (newChatIds.length > 0) {
			if (debounceChatReadTimer) {
				clearTimeout(debounceChatReadTimer);
			}
			debounceChatReadTimer = setTimeout(() => {
				supabase
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

	function subscribeToMessages() {
		subscription = supabase
			.channel(`message-board-chat:${orderId}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'Chat', filter: `relationship_id=eq.${orderId}` },
				(payload) => {
					const row = payload.new as ChatMessage;
					if (payload.eventType === 'INSERT') {
						messages = [...messages, row];
						newChatIds.push(row.chat_id);
					}
					if (payload.eventType === 'UPDATE') {
						messages = messages.map((msg) => {
							if (msg.chat_id === row.chat_id) return row;
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
		const viewerId = session?.data?.user?.id;
		if (viewerId) {
			supabase
				.from('Chat')
				.update({ status: 'read' })
				.eq('relationship_id', orderId)
				.eq('recipient_id', viewerId)
				.eq('status', 'sent')
				.then(() => {});
		}
		return () => {
			if (subscription) supabase.removeChannel(subscription);
		};
	});

	async function sendMessage(e?: Event) {
		e?.preventDefault();
		if (sending || !newMessage.trim() || !session?.data?.user?.id) return;
		sending = true;
		try {
			const sentText = newMessage;
			const result = await sendChatMessage(fetch, {
				relationship_id: orderId,
				recipient_id: receiverId,
				message: sentText,
				message_type: 'text',
				status: 'sent'
			});
			if (result.ok) {
				// Clear only what was sent; keep anything typed while it was on its way.
				if (newMessage === sentText) newMessage = '';
			} else {
				toastStore.show(`Couldn't send your message. ${result.error.message}`, 'error');
			}
		} finally {
			sending = false;
		}
	}

	// Enter sends; Shift+Enter adds a new line.
	function handleComposerKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			void sendMessage();
		}
	}

	$effect(() => {
		const viewerId = session?.data?.user?.id;
		if (viewerId && messages.length > 0) {
			const unread = messages.filter(
				(msg) => msg.recipient_id === viewerId && msg.status === 'sent'
			);
			if (unread.length > 0) {
				// The query builder only runs once it is awaited or then'd.
				void supabase
					.from('Chat')
					.update({ status: 'read' })
					.eq('relationship_id', orderId)
					.eq('recipient_id', viewerId)
					.eq('status', 'sent')
					.then(() => {});
			}
		}
	});

	function isLatestQuote(index: number) {
		let lastIndex = -1;
		for (let j = messages.length - 1; j >= 0; j--) {
			if (
				messages[j].message_type === 'quote' &&
				messages[j].recipient_id === session?.data?.user?.id
			) {
				lastIndex = j;
				break;
			}
		}
		return index === lastIndex;
	}
</script>

<div class="relative flex h-full flex-col">
	{#if disabled}
		<div
			class="absolute inset-0 z-10 flex cursor-not-allowed items-center justify-center rounded-md bg-background/80 backdrop-blur-sm">
			<span class="px-6 text-center text-sm text-muted-foreground"
				>Chat is closed because this request was cancelled or completed.</span>
		</div>
	{/if}

	<div class="border-b border-border px-4 py-3">
		<PortalSectionLabel label="Messages" class="mb-0" />
	</div>

	<div class="relative flex flex-1">
		<div
			class="absolute inset-0 flex flex-1 flex-col overflow-y-auto bg-muted/10 p-4"
			bind:this={scrollContainer}
			onscroll={handleScroll}>
			<div
				class="mb-3 flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
				<Icon icon={F.info} class="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				<span class="text-sm leading-relaxed text-muted-foreground">
					You can't attach files here yet. Share a link to photos instead.
				</span>
			</div>

			{#if loading}
				<div class="flex-1 space-y-4 py-4" aria-hidden="true">
					<MessageBubbleSkeleton align="left" />
					<MessageBubbleSkeleton align="right" />
					<MessageBubbleSkeleton align="left" />
					<MessageBubbleSkeleton align="right" />
				</div>
			{:else if error}
				<div class="py-8 text-center text-sm text-destructive">{error}</div>
			{:else if messages.length === 0}
				<div class="py-8 text-center text-sm text-muted-foreground">
					No messages yet. Ask a question or share details about your print.
				</div>
			{:else}
				<div class="flex-1 space-y-4">
					{#each messages as msg, i (msg.chat_id)}
						{#if i === 0 || getDateLabel(msg.created_at) !== getDateLabel(messages[i - 1].created_at)}
							<div class="my-2 flex justify-center">
								<span
									class="rounded-md border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
									{getDateLabel(msg.created_at)}
								</span>
							</div>
						{/if}

						{@const isOwn = msg.sender_id === session?.data?.user?.id}
						<div class={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
							{#if msg.message_type === 'action'}
								{@const actionObj = JSON.parse(msg.message ?? '{}')}
								{#if actionObj.action === 'shipped'}
									{@const shippedObj = JSON.parse(msg.message ?? '{}')}
									<div
										class={cn(
											'flex max-w-xs flex-col items-start break-words rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground',
											isOwn ? 'self-end' : 'self-start'
										)}>
										<div class="flex items-center gap-2 font-medium">
											<Icon icon={F.truck} class="text-base text-warning" />
											<span>Shipped via {shippedObj.courier}</span>
										</div>
										{#if shippedObj.tracking_id}
											<div
												class="mt-2 w-full rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
												<span class="text-muted-foreground">Tracking ID:</span>
												<span class="ml-1">{shippedObj.tracking_id}</span>
											</div>
										{/if}
										{#if shippedObj.tracking_link}
											<!-- eslint-disable svelte/no-navigation-without-resolve -- courier's external tracking page -->
											<a
												href={shippedObj.tracking_link}
												target="_blank"
												rel="noopener noreferrer"
												class="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs transition-colors hover:bg-muted">
												<Icon icon={F.box} class="text-base" />
												Track package
											</a>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}
										{#if shippedObj.reason}
											<div class="mt-2 w-full text-xs text-muted-foreground">
												{shippedObj.reason}
											</div>
										{/if}
									</div>
								{:else}
									{@const isCancel =
										actionObj?.action === 'cancel' ||
										actionObj?.action === 'cancelled' ||
										actionObj?.action === 'decline' ||
										actionObj?.action === 'declined'}
									<div
										class={cn(
											'flex max-w-xs flex-col break-words rounded-md border px-3 py-2 text-sm',
											isCancel
												? 'border-destructive/30 bg-destructive/5 text-destructive'
												: 'border-border bg-card text-foreground',
											isOwn ? 'self-end' : 'self-start'
										)}>
										<div class="flex w-full items-start gap-1 font-medium">
											{#if isCancel}
												<Icon icon={F.warning} class="text-base" aria-hidden="true" />
											{/if}
											{actionObj?.action
												? (
														actionObj.action.charAt(0).toUpperCase() + actionObj.action.slice(1)
													).replace(/_/g, ' ')
												: 'Update'}
										</div>
										{#if actionObj?.reason}
											<div class="mt-1 text-sm">
												<span class="text-muted-foreground">Reason:</span>
												<span class="ml-1">{actionObj.reason}</span>
											</div>
										{/if}
									</div>
								{/if}
							{:else if msg.message_type === 'quote'}
								{@const quoteObj = JSON.parse(msg.message ?? '{}')}
								<div
									class={cn(
										'flex max-w-xs flex-col break-words rounded-md border border-border bg-card px-3 py-2 text-sm',
										isOwn ? 'self-end' : 'self-start'
									)}>
									<div class="flex items-center gap-1 text-xs text-muted-foreground">
										<Icon icon={F.money} class="text-base" aria-hidden="true" />
										{isOwn ? 'Quote sent' : 'Quote received'}
									</div>
									{#if quoteObj.reason}
										<div class="mt-1 text-foreground">{quoteObj.reason}</div>
									{/if}
									<div class="mt-1 text-2xl font-semibold tabular-nums text-foreground">
										{formatInr(quoteObj.quote)}
									</div>
									{#if msg.recipient_id === session?.data?.user?.id && isLatestQuote(i)}
										<ScButton
											class="mt-2 w-full"
											onclick={paynow
												? () => paynow()
												: () =>
														toastStore.show(
															'Close the chat, choose an address, then select Pay.',
															'info'
														)}>
											Pay now
										</ScButton>
									{/if}
								</div>
							{:else}
								<div
									class={cn(
										'max-w-xs whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm',
										isOwn
											? 'bg-foreground text-background'
											: 'border border-border bg-card text-foreground'
									)}>
									{filter.clean(msg.message ?? '')}
								</div>
							{/if}

							<div class="mt-1 flex gap-0.5">
								{#if isOwn}
									<span class={msg.status === 'read' ? 'text-foreground' : 'text-muted-foreground'}>
										<Icon icon={msg.status === 'read' ? F.checkAll : F.check} class="size-3" />
									</span>
								{/if}
								<div class="text-xs text-muted-foreground">
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

	<div class="border-t border-border p-4">
		<form
			class="flex items-end gap-2 rounded-md border border-border bg-card px-3 py-2"
			onsubmit={sendMessage}>
			<textarea
				rows="2"
				class="max-h-40 min-h-10 flex-1 resize-y border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
				placeholder="Write a message. Enter sends, Shift+Enter adds a line."
				aria-label="Message"
				bind:value={newMessage}
				onkeydown={handleComposerKeydown}
				{disabled}></textarea>
			<button
				type="submit"
				class="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
				disabled={disabled || sending || !newMessage.trim()}
				aria-label={sending ? 'Sending message' : 'Send message'}>
				<Icon icon={F.send} class="size-5" aria-hidden="true" />
			</button>
		</form>
	</div>
</div>
