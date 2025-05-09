<script lang="ts">
	import MessageBoard from '$lib/components/maker/MessageBoard.svelte';
	import Icon from '@iconify/svelte';
	import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
	import { page } from '$app/state';
	import { elasticInOut, expoInOut } from 'svelte/easing';
	import { toastStore } from '$lib/client/toastStore';
	import { fade, slide } from 'svelte/transition';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto, invalidate } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { newAddress, validateAddress, type Address } from '$lib/types/product';
	import type { Writable } from 'svelte/store';
	import { setLoading } from '$lib/client/loading';
	let { data } = $props();

	let req = $state(data.printRequest);
	let sortedEvents = $derived(
		req.events
			? [...req.events]
				.filter((event: any) => event.type !== 'order_created')
				.sort(
					(a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
			: []
	);
	$effect(() => {
		req = data.printRequest;
	});

	const maker = data.maker;
	let load_store = getContext<Writable<boolean>>('loading');
	let downloading = $state(false);
	let messageBoardOpen = $state(false);
	let cancelDialogOpen = $state(false);
	let cancelReason = $state('');
	let downloadProgress = $state(0);
	let unreadCount = $state(0);
	let validAddress = $state<Address>({});
	let addressValid: boolean = $state(false);
	if (data.session.data.user && data.addresses && data.addresses.length > 0) {
		const firstAddress = data.addresses[0];
		if (validateAddress(firstAddress) == null) {
			addressValid = true;
			validAddress = firstAddress;
		} else {
			addressValid = false;
			validAddress = newAddress();
		}
	} else {
		addressValid = false;
		validAddress = newAddress();
	}

	let modelName = req.model?.split('/').pop().split('.');
	let modelName2 = modelName[modelName.length - 2].split('_');
	modelName = `${modelName2[modelName2.length - 1]}.${modelName[modelName.length - 1]}`;
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

	// Add a mapping for stage colors
	const STAGE_COLORS: { [key: string]: string } = {
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

	const STAGE_DESCRIPTIONS: { [key: string]: string } = {
		cancelled: 'The request has been cancelled.',
		requested: 'You have requested a quote for a 3D print. Please wait for the maker to quote you.',
		quoted: 'A maker has quoted you. Please review the quote and accept or reject it.',
		actionable: 'Maker has requested an action from you. Please take action on the request.',
		shipped: 'The maker has shipped the 3D print. Please wait for it to be delivered and then mark it as delivered. We kindly request you to leave a review for the maker after the delivery.',
		paid: 'You have paid for the 3D print. Please wait for the maker to complete the print.',
		paid_externally:
			'You have paid for the 3D print externally. Please wait for the maker to complete the print.',
		completed:
			'You have acknowledged the receipt of the 3D print. Please leave a review for the maker.',
		'in dispute': 'The request is in dispute. Our Team will intervene to resolve the dispute.',
		default: 'The request is in default.'
	};

	let payLoading = $state(false);

	$effect(() => {
		if (payLoading) {
			setLoading(load_store, true);
		} else {
			setLoading(load_store, false);
		}
	});

	async function payQuote(amount: number) {
		if (payLoading) return;
		if (!req?.model) return;
		payLoading = true;
		//check for address validity
		let addressValidity = validateAddress(validAddress);
		if (addressValidity) {
			highlightAddressSelector();
			toastStore.show(addressValidity, 'error');
			payLoading = false;
			return;
		}
		//check for user session
		const { data: userRes, error: userErr } = await data.supabase_lt.auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('Invalid session, please reload the page or login again', 'error');
			payLoading = false;
			return;
		}
		//POST request to create a new order ('/3dp-portal/user/[id]')
		const res = await fetch(`/3dp-portal/user/${req.id}`, {
			method: 'POST',
			body: JSON.stringify({ address: validAddress, amount: amount })
		});
		if (res.ok) {
			const data = await res.json();
			if (data.success) {
				//Order created successfully now open rzp dialog
				openRazorpayDialog(data.order_id, data.amount);
				payLoading = false;
				return;
			} else {
				toastStore.show(data.error, 'error');
			}
		} else {
			toastStore.show('Failed to create order', 'error');
		}
		payLoading = false;
	}

	async function openRazorpayDialog(order_id: string, amount: number) {
		try{
			var options = {
				key: PUBLIC_RAZORPAY_ID, // Enter the Key ID generated from the Dashboard
				amount: amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
				currency: 'INR',
				name: 'SelfCrafted',
				image:
					'https://pfeewicqoxkuwnbuxnoz.supabase.co/storage/v1/object/public/images/favicon.png',
				order_id: order_id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
				handler: async function (response: any) {
					// Add check for cartData inside handler as well, just in case
					if (!req) {
						console.error('Print request data became unavailable during payment processing.');
						return;
					}
					const formData2 = new FormData();
					formData2.append('payment_id_a', response.razorpay_order_id);
					formData2.append('payment_id_b', response.razorpay_payment_id);
					formData2.append('payment_signature', response.razorpay_signature);
					formData2.append('amount', amount.toString());
					const patchResult = await fetch(`/3dp-portal/user/${req.id}`, {
						method: 'PATCH',
						body: formData2
					}); // Use a different variable name
					if (!patchResult.ok) {
						console.error('Failed to update order status after payment.');
						return;
					}
					goto(`/summary/success/${req.id}/${response.razorpay_payment_id}`);
				},
				modal: {
					ondismiss: async function () {
						//remove order_created event from print request
						// await data.supabase_lt.from('printrequests').update({
						// 	order_id: null,
						// 	events: data.printRequest.events.filter((event: any) => event.type !== 'order_created')
						// }).eq('id', req.id);
						invalidate('3dp-portal:printrequest');
						toastStore.show('Payment cancelled by User', 'warning');
						return;
					}
				},
				prefill: {},
				theme: {
					color: '#2084fe'
				}
			};
			// @ts-ignore - Razorpay is loaded from external script
			var rzp1 = new Razorpay(options);
			if (!rzp1) {
				alert('Issue with Payment Provider, try again');
				return;
			}
			// @ts-ignore - Razorpay is loaded from external script
			rzp1.open();
			// @ts-ignore - Razorpay is loaded from external script
			rzp1.on('payment.failed', function (response: any) {
				toastStore.show('Payment failed, please try again', 'error');
				// @ts-ignore - Razorpay is loaded from external script
				rzp1.close();
				window.location.href = `/summary/failure/${req.id}/${response.error.metadata.order_id}`;
				return;
			});
		}catch(e){
			// Explicitly type caught error as unknown
			console.error('Error during payment process:', e);
			// Provide more specific error feedback if possible
			toastStore.show(
				`An unexpected error occurred during payment: ${e instanceof Error ? e.message : 'Unknown error'}`,
				'error'
			);
			return;
		}
	}

	async function downloadModel() {
		if (!req?.model) return;
		const { data: userRes, error: userErr } = await data.supabase_lt.auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('You must be logged in to request a quote', 'error');
			return;
		}
		const jwt = userRes.session.access_token;
		if (!jwt) {
			alert('Session expired or not found. Please log in again.');
			downloading = false;
			return;
		}
		downloading = true;
		downloadProgress = 0;
		try {
			const res = await fetch(
				'https://pfeewicqoxkuwnbuxnoz.supabase.co/functions/v1/download-model-request',
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ model_url: req.model })
				}
			);
			const result = await res.json();
			if (result?.url) {
				// Use XMLHttpRequest for progress tracking
				const xhr = new XMLHttpRequest();
				xhr.open('GET', result.url, true);
				xhr.responseType = 'blob';
				xhr.onprogress = (event) => {
					if (event.lengthComputable) {
						downloadProgress = Math.round((event.loaded / event.total) * 100);
					}
				};
				xhr.onload = function () {
					if (xhr.status === 200) {
						const url = window.URL.createObjectURL(xhr.response);
						const a = document.createElement('a');
						a.href = url;
						a.download = modelName;
						document.body.appendChild(a);
						a.click();
						setTimeout(() => {
							window.URL.revokeObjectURL(url);
							document.body.removeChild(a);
						}, 100);
					} else {
						alert('Failed to download file');
					}
					downloading = false;
					downloadProgress = 0;
				};
				xhr.onerror = function () {
					alert('Error downloading model');
					downloading = false;
					downloadProgress = 0;
				};
				xhr.send();
			} else {
				alert(result?.error || 'Failed to get download link');
				downloading = false;
				downloadProgress = 0;
			}
		} catch (e) {
			alert('Error downloading model');
		} finally {
			// Only reset if not downloading (handled in xhr events)
		}
	}

	async function onCancelCancel(e: MouseEvent) {
		e.preventDefault();
		cancelDialogOpen = false;
		cancelReason = '';
	}

	async function onConfirmCancel(e: MouseEvent) {
		e.preventDefault();
		if (!req || !data.session?.data?.user?.id || !cancelReason.trim()) return;
		const prevSelectedId = req.id;
		//repull the order data
		const updatedOrder = await data.supabase_lt
			.from('printrequests')
			.select('*')
			.eq('id', req.id)
			.single();
		if (!updatedOrder.data) return;
		// 1. Send chat message of type 'action'
		await data.supabase_lt.from('Chat').insert([
			{
				sender_id: data.session.data.user.id,
				recipient_id: req.creator_id ?? '',
				message: JSON.stringify({ action: 'cancelled', reason: cancelReason }),
				relationship_id: req.id,
				message_type: 'action',
				status: 'sent'
			}
		]);
		// 2. Update print request's request_stage
		await data.supabase_lt
			.from('printrequests')
			.update({
				request_stage: 'cancelled',
				last_updated: new Date().toISOString(),
				update_count: (updatedOrder.data?.update_count || 0) + 1,
				events: [
					...(updatedOrder.data?.events || []),
					{
						type: 'cancelled',
						reason: cancelReason,
						timestamp: new Date().toISOString(),
						by: 'user'
					}
				]
			})
			.eq('id', req.id);
		if (updatedOrder.error) {
			console.error('Error updating order', updatedOrder.error);
			return;
		}
		// 3. Close dialog and clear reason
		cancelDialogOpen = false;
		cancelReason = '';
		// 4. Refresh page
		window.location.reload();
	}

	$effect(() => {
		(async () => {
			if (!data.session?.data?.user?.id) return;
			const { data: unread, error } = await data.supabase_lt
				.from('Chat')
				.select('chat_id')
				.eq('relationship_id', req.id)
				.eq('recipient_id', data.session.data.user.id)
				.eq('status', 'sent');
			if (error) return;
			unreadCount = unread.length;
		})();
	});

	$effect(() => {
		if (messageBoardOpen) {
			unreadCount = 0;
		}
	});

	onMount(() => {
		//track unread counts by subscribing to the chat channel
		if (!data.session?.data?.user?.id) return;
		const chatSubscription = data.supabase_lt
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
					if (payload.new.message_type == 'quote' || payload.new.message_type == 'action') {
						//update quote & event history
						invalidate('3dp-portal:printrequest');
					}
					//update unread count
					unreadCount = (unreadCount || 0) + 1;
				}
			)
			.subscribe();
		return () => {
			data.supabase_lt.removeChannel(chatSubscription);
		};
	});

	// --- Highlight/Scroll helpers ---
	let addressSelectorRef : HTMLDivElement | null = $state(null);
	let payButtonRef : HTMLButtonElement | null = $state(null);
	let highlightAddress = $state(false);
	let highlightPay = $state(false);

	function highlightAddressSelector() {
		if (addressSelectorRef) {
			addressSelectorRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
			highlightAddress = true;
			setTimeout(() => (highlightAddress = false), 1200);
		}
	}

	function highlightPayButton() {
		if (payButtonRef) {
			payButtonRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
			highlightPay = true;
			setTimeout(() => (highlightPay = false), 1200);
		}
	}

	let completeDialogOpen = $state(false);
	let completeReason = $state('');

	async function onCancelComplete(e: MouseEvent) {
		e.preventDefault();
		completeDialogOpen = false;
		completeReason = '';
	}

	async function onConfirmComplete(e: MouseEvent) {
		e.preventDefault();
		if (!req || !data.session?.data?.user?.id) return;
		const updatedOrder = await data.supabase_lt
			.from('printrequests')
			.select('*')
			.eq('id', req.id)
			.single();
		if (!updatedOrder.data) return;
		// 1. Send chat message of type 'action' (optional: can add a message for completion)
		await data.supabase_lt.from('Chat').insert([
			{
				sender_id: data.session.data.user.id,
				recipient_id: req.creator_id ?? '',
				message: JSON.stringify({ action: 'completed', reason: completeReason }),
				relationship_id: req.id,
				message_type: 'action',
				status: 'sent'
			}
		]);
		// 2. Update print request's request_stage
		await data.supabase_lt
			.from('printrequests')
			.update({
				request_stage: 'completed',
				last_updated: new Date().toISOString(),
				update_count: (updatedOrder.data?.update_count || 0) + 1,
				events: [
					...(updatedOrder.data?.events || []),
					{
						type: 'completed',
						reason: completeReason,
						timestamp: new Date().toISOString(),
						by: 'user'
					}
				]
			})
			.eq('id', req.id);
		// 3. Invoke creator stats update
		await fetch('/3dp-portal/maker/' + req.creator_id + '/statsUpdate', {
			method: 'POST'
		});

		if (updatedOrder.error) {
			console.error('Error updating order', updatedOrder.error);
			return;
		}
		completeDialogOpen = false;
		completeReason = '';
		window.location.reload();
	}

	// --- Review Maker State ---
	let reviewDialogOpen = $state(false);
	let reviewDeleteDialogOpen = $state(false);
	let reviewRating = $state(5);
	let reviewComment = $state('');
	let reviewLoading = $state(false);
	let reviewError = $state('');
	let userReview: any = $state(null);

	// Fetch review for this user, maker, and print request
	async function fetchUserReview() {
		if (!data.session?.data?.user?.id || !req?.id || !req?.creator_id) return;
		reviewLoading = true;
		reviewError = '';
		const { data: review, error } = await data.supabase_lt
			.from('CreatorReviews')
			.select('*')
			.eq('user_id', data.session.data.user.id)
			.eq('maker_id', req.creator_id)
			.eq('print_request_id', req.id)
			.single();
		if (error && error.code !== 'PGRST116') reviewError = error.message;
		userReview = review || null;
		reviewLoading = false;
		if (userReview) {
			reviewRating = userReview.rating;
			reviewComment = userReview.comment;
		}
	}

	$effect(() => {
		if (req?.request_stage === 'completed') fetchUserReview();
	});

	async function openReviewDialog() {
		reviewError = '';
		reviewDialogOpen = true;
		if (userReview) {
			reviewRating = userReview.rating;
			reviewComment = userReview.comment;
		} else {
			reviewRating = 5;
			reviewComment = '';
		}
	}

	async function submitReview() {
		if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
			reviewError = 'Please select a rating.';
			return;
		}
		if (!reviewComment.trim()) {
			reviewError = 'Please enter a review.';
			return;
		}
		reviewLoading = true;
		const payload = {
			user_id: data.session.data.user.id,
			maker_id: req.creator_id,
			print_request_id: req.id,
			rating: reviewRating,
			comment: reviewComment.trim()
		};
		let result;
		if (userReview) {
			result = await data.supabase_lt
				.from('CreatorReviews')
				.update(payload)
				.eq('id', userReview.id)
				.select('*');
		} else {
			result = await data.supabase_lt
				.from('CreatorReviews')
				.insert(payload)
				.select('*');
		}
		if (result.error) {
			reviewError = result.error.message;
			reviewLoading = false;
			return;
		}
		userReview = result.data?.[0] || userReview;
		reviewDialogOpen = false;
		reviewLoading = false;
		toastStore.show(userReview ? 'Review updated!' : 'Review added!', 'success');
	}

	async function deleteReview() {
		if (!userReview) return;
		reviewLoading = true;
		const { error } = await data.supabase_lt
			.from('CreatorReviews')
			.delete()
			.eq('id', userReview.id);
		if (error) {
			reviewError = error.message;
			reviewLoading = false;
			return;
		}
		userReview = null;
		reviewDeleteDialogOpen = false;
		reviewDialogOpen = false;
		reviewLoading = false;
		reviewRating = 5;
		reviewComment = '';
		toastStore.show('Review deleted.', 'success');
	}
</script>

<svelte:head>
	<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</svelte:head>


<div class="p-2 sm:p-4 max-w-3xl mx-auto h-full flex flex-col">
	<!-- <button onclick={()=>{
		// 3. Invoke creator stats update
		fetch('/3dp-portal/maker/' + req.creator_id + '/statsUpdate', {
			method: 'POST'
		});
	}}>Invoke stats update</button> -->
	<button
		onclick={() => goto('/3dp-portal/user')}
		class="mb-4 text-accent text-sm font-medium flex items-center gap-1"
		><span>&larr;</span> Back</button>
	{#if !req}
		<div class="text-red-400 text-center py-12">Print request not found.</div>
	{:else}
		<div
			class="bg-black/60 rounded-lg p-4 flex flex-col items-start shadow-glow-subtle border border-accent/10 cursor-pointer select-none">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex flex-col items-start justify-between w-full">
				<div class="font-semibold text-white text-lg truncate">
					{modelName ?? 'Model'}
				</div>
				<div class="text-xs text-gray-400">{new Date(req.created_at).toLocaleString()}</div>
			</div>
		</div>
		<!-- Other details header -->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Other Details</div>
			<div class="flex flex-col mt-2">
				{#if maker}
					<div
						class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex flex-col text-sm">
						<span>Maker: <span class="font-semibold">{maker.name}</span></span>
						<span class="text-gray-400">({maker.email}, {maker.contact_number})</span>
					</div>
				{/if}
			</div>
		</div>
		<!-- Review Maker Section -->
		<div class="flex flex-col h-full mt-2 w-full">
			{#if req.request_stage === 'completed'}
				<div class="text-sm text-gray-400 font-semibold mb-2">Review Maker</div>
				{#if reviewLoading}
					<div class="text-gray-400 text-sm">Loading review...</div>
				{:else}
					{#if userReview}
						<div class="flex items-center gap-2 mb-2">
							{#each Array(5) as _, i}
								<Icon icon="iconamoon:star-duotone" class={i < userReview.rating ? 'text-yellow-400' : 'text-gray-600'} />
							{/each}
							<span class="text-gray-300 text-sm">{userReview.comment}</span>
						</div>
						<div class="flex gap-2">
							<button 
								onclick={openReviewDialog} 
								class="bg-black/20 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent/10 transition-all flex items-center gap-1">
								<Icon icon="material-symbols:edit-outline" class="text-sm" />
								Edit Review
							</button>
							<button 
								onclick={() => (reviewDeleteDialogOpen = true)} 
								class="bg-black/20 text-red-400 border border-red-400/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/10 transition-all flex items-center gap-1">
								<Icon icon="material-symbols:delete-outline" class="text-sm" />
								Delete
							</button>
						</div>
					{:else}
						<button onclick={openReviewDialog} class="bg-accent text-black px-3 py-1.5 rounded-lg text-xs font-medium hover:brightness-110 transition-all">Add Review</button>
					{/if}
				{/if}
			{/if}
		</div>
		<!-- Model details header -->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Model Details</div>
			<div class="flex flex-wrap gap-x-2 mt-2">
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Model color:</div>
					<div class="w-5 h-5 rounded-sm" style={`background-color:${req.model_data.color}`}></div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Material:</div>
					<div>{req.model_data.material}</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Quality:</div>
					<div>{req.model_data.quality}</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Scale:</div>
					<div>{req.model_data.scale}x</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Infill:</div>
					<div>{req.model_data.infill}%</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Walls:</div>
					<div>{req.model_data.walls}</div>
				</div>
			</div>
		</div>
		<!-- Stage details header-->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Stage Details</div>
			<div class="flex flex-col mt-2">
				<div
					class={`mb-2 px-4 py-2 rounded-lg border w-fit flex gap-2 items-center text-sm font-semibold transition-all duration-200 ${STAGE_COLORS[String(req.request_stage)] || STAGE_COLORS.default}`}>
					<span class="capitalize">{req.request_stage}</span>
				</div>
			</div>
			<!-- show the stage description -->
			<div class="text-sm text-gray-400">
				{STAGE_DESCRIPTIONS[String(req.request_stage)] || 'No description available'}
			</div>
		</div>

		<!-- Actions header -->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Actions</div>
			<!-- chat button that opens drawer with message board-->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
				<button
					class="relative bg-accent/10 hover:bg-accent/20 text-accent px-2 py-2 rounded-lg transition-all duration-200 disabled:opacity-60 flex justify-center items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-accent/20 hover:border-accent/40"
					onclick={() => (messageBoardOpen = true)}>
					<Icon icon="mdi:message" class="w-5 h-5" />
					<span class="font-medium text-sm">Message</span>
					{#if unreadCount > 0}
						<span
							class="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
							{unreadCount}
						</span>
					{/if}
				</button>
				{#if req.request_stage !== 'cancelled'}
					<button
						class="bg-accent/10 hover:bg-accent/20 text-accent px-2 py-2 rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-accent/20 hover:border-accent/40 flex-col"
						onclick={(e) => {
							e.stopPropagation();
							downloadModel();
						}}
						disabled={downloading}>
						<div class="flex">
							<Icon icon="mdi:download" class="w-5 h-5" />
							<span class="font-medium text-sm"
								>{downloading
									? downloadProgress > 0
										? `Downloading... ${downloadProgress}%`
										: 'Downloading...'
									: 'Download Model'}</span>
						</div>
						{#if downloading && downloadProgress > 0}
							<div class="w-full bg-gray-700 rounded h-2">
								<div
									class="bg-accent h-2 rounded transition-all duration-200"
									style={`width: ${downloadProgress}%`}>
								</div>
							</div>
						{/if}
					</button>
				{/if}
				<!-- help button that redirects to discord#help channel-->
				<a
					href="https://discord.gg/k6CC6GTR4g"
					class=" bg-yellow-400/10 hover:bg-yellow-500/20 text-yellow-300 justify-center px-2 py-2 rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-yellow-400/20 hover:border-yellow-400/40"
					target="_blank"
					rel="noopener noreferrer">
					<Icon icon="ph:discord-logo-duotone" class="w-5 h-5" />
					<span class="font-medium text-sm">Help</span>
				</a>
				<!-- if the current stage is requested, show a button to cancel the request-->
				{#if req.request_stage === 'requested' || req.request_stage === 'quoted'}
					<button
						class="bg-red-400/10 hover:bg-red-500/20 text-red-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-red-400/20 hover:border-red-400/40"
						onclick={() => (cancelDialogOpen = true)}>
						<Icon icon="mdi:cancel" class="w-5 h-5" />
						<span class="font-medium text-sm">Cancel</span>
					</button>
				{/if}
				<!-- if the current stage is shipped, show a button to mark as completed -->
				{#if req.request_stage === 'shipped'}
					<button
						class="bg-emerald-400/10 hover:bg-emerald-500/20 text-emerald-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-emerald-400/20 hover:border-emerald-400/40"
						onclick={() => (completeDialogOpen = true)}>
						<Icon icon="mdi:check-circle" class="w-5 h-5" />
						<span class="font-medium text-sm">Mark as Delivered</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Payment details header-->
		{#if req.request_stage === 'quoted'}
			<div class="flex flex-col h-full mt-4 w-full">
				<div class="text-sm text-gray-400 font-semibold">Payment Details</div>

				<div
					bind:this={addressSelectorRef}
					class="mt-2 rounded-xl"
					class:highlight-animation={highlightAddress}>
					<AddressInputSelector
						email={data.session.data.user.email}
						userExists={true}
						addresses={data.addresses}
						bind:address={validAddress}
						bind:addressValid />
				</div>
				<!-- if the current stage is quoted, show a button to pay the quote-->
				<button
					class="mt-2 bg-emerald-400/10 hover:bg-emerald-500/20 text-emerald-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-emerald-400/20 hover:border-emerald-400/40"
					class:!ring-4={highlightPay}
					class:!ring-emerald-400={highlightPay}
					class:!ring-offset-2={highlightPay}
					class:!transition-all={highlightPay}
					class:!duration-500={highlightPay}
					disabled={payLoading}
					bind:this={payButtonRef}
					onclick={() => {
						const amount = req.events
								.filter((e: any) => e.type === 'quoted')
								.sort(
									(a: any, b: any) =>
										new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
								)[0]?.extra.quote;
						payQuote(amount);
					}}>
					{#if !payLoading}
						<span class="font-medium text-sm"
							>Pay {req.events
								.filter((e: any) => e.type === 'quoted')
								.sort(
									(a: any, b: any) =>
										new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
								)[0]?.extra.quote}₹</span>
					{:else}
						<span class="font-medium text-sm">Processing...</span>
					{/if}
				</button>
			</div>
		{/if}

		<!-- Event history header-->
		{#if sortedEvents && sortedEvents.length > 0}
			<div class="flex flex-col h-full mt-4 w-full">
				<div class="text-sm text-gray-400 font-semibold mb-2">Event history</div>
				<div class="flex flex-col gap-2">
					{#each sortedEvents as event}
						<div class="bg-black/10 px-4 py-2 rounded-lg border border-accent/10 text-sm {event.type === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-400/20' : ''} {event.type == 'paid' ? 'bg-green-500/10 text-green-400 border-green-400/20' : ''}">
							<div class="flex items-center justify-between text-white/80">
								<span class="font-medium"
									>Event : <span class="capitalize">{event.type}</span></span>
								<span class="text-gray-400 text-xs"
									>{new Date(event.timestamp).toLocaleString(undefined, {
										hour: '2-digit',
										minute: '2-digit',
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}</span>
							</div>
							{#if event.reason}
								<div class="text-gray-400 mt-1 text-xs">Message : {event.reason}</div>
							{/if}
							{#if event.extra}
								{#if event.extra.quote}
									<div class="text-gray-400 mt-1 font-semibold">Quote : {event.extra.quote}₹</div>
								{/if}
								{#if event.extra.payment_id_a}
									<div class="text-gray-400 mt-1 font-semibold">Order ID : {event.extra.payment_id_a}</div>
								{/if}
								{#if event.extra.payment_id_b}
									<div class="text-gray-400 mt-1 font-semibold">Payment ID : {event.extra.payment_id_b}</div>
								{/if}
								{#if event.extra.amount}
									<div class="text-gray-400 mt-1 font-semibold">Amount : {(event.extra.amount/100).toFixed(2)}₹</div>
								{/if}
							{/if}
							<div class="text-accent/80 text-xs mt-1">
								by <span class="capitalize">{event.by == 'user' ? 'you' : 'maker'}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="flex flex-col h-full mt-4 w-full">
				<div class="text-sm text-gray-400 font-semibold mb-2">Event history</div>
				<div class="text-gray-400 text-start py-2 text-sm italic opacity-60 text-wrap">
					So empty.... <br />If any notable events (quotes,cancellations,payments,etc) happen,<br />
					they will be shown here.
				</div>
			</div>
		{/if}

		
	{/if}
</div>

{#if messageBoardOpen}
	<Drawer.Root bind:open={messageBoardOpen}>
		<Drawer.Trigger style="display:none" />
		<Drawer.Content class="max-w-3xl mx-auto h-[100vh] sm:h-[80vh] transition-all duration-200">
			<MessageBoard
				orderId={req.id}
				supabase_lt={data.supabase_lt}
				session={data.session}
				receiverId={req.creator_id ?? ''}
				disabled={req.request_stage === 'cancelled' || req.request_stage === 'completed'}
				paynow={() => {
					//close drawer
					messageBoardOpen = false;
					//highlight pay button
					highlightPayButton();
					toastStore.show('Select address and click pay now', 'info');
				}} />
		</Drawer.Content>
	</Drawer.Root>
{/if}

<Dialog.Root bind:open={cancelDialogOpen}>
	<Dialog.Content class="z-[1050]">
		<Dialog.Header>
			<Dialog.Title>Cancel Order</Dialog.Title>
			<Dialog.Description>
				Please provide a reason for cancellation. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea bind:value={cancelReason} class="w-full mt-4" placeholder="Enter reason..." />
		<Dialog.Footer>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors mr-2"
				onclick={onCancelCancel}>Cancel</button>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
				onclick={onConfirmCancel}
				disabled={!cancelReason.trim()}>Confirm</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={completeDialogOpen}>
	<Dialog.Content class="z-[1050]">
		<Dialog.Header>
			<Dialog.Title>Mark as Completed</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to mark this order as completed? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea bind:value={completeReason} class="w-full mt-4" placeholder="(Optional) Add a note..." />
		<Dialog.Footer>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors mr-2"
				onclick={onCancelComplete}>Cancel</button>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
				onclick={onConfirmComplete}>Confirm</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Review Maker Dialogs -->
{#if reviewDialogOpen}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-[#151515] rounded-2xl p-6 w-full max-w-md border border-[#252525] relative">
			<button onclick={() => (reviewDialogOpen = false)} class="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors p-1">
				<Icon icon="iconamoon:close" class="text-xl" />
			</button>
			<div class="text-lg font-bold text-white mb-4">{userReview ? 'Edit Your Review' : 'Write a Review'}</div>
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-300 mb-2">Rating</label>
				<div class="flex gap-1">
					{#each Array(5) as _, i}
						<button onclick={() => (reviewRating = i + 1)} class="text-2xl p-1.5 -mx-1 transition-colors">
							<Icon icon="iconamoon:star-duotone" class={i < reviewRating ? 'text-yellow-400' : 'text-gray-600'} />
						</button>
					{/each}
				</div>
			</div>
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-300 mb-2">Your Review</label>
				<Textarea bind:value={reviewComment} class="w-full h-24 bg-[#0c0c0c] border border-[#252525] rounded-lg p-3 text-white text-sm focus:outline-hidden focus:border-accent transition-colors resize-none" placeholder="Share your experience..." />
			</div>
			{#if reviewError}
				<div class="text-red-400 text-sm mb-4">{reviewError}</div>
			{/if}
			<div class="flex gap-3">
				<button onclick={() => (reviewDialogOpen = false)} class="flex-1 py-2 px-4 bg-[#252525] text-white rounded-lg hover:bg-[#353535] transition-colors">Cancel</button>
				<button onclick={submitReview} disabled={reviewLoading} class="flex-1 py-2 px-4 bg-accent text-black rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{reviewLoading ? 'Submitting...' : (userReview ? 'Update Review' : 'Submit Review')}</button>
			</div>
		</div>
	</div>
{/if}
{#if reviewDeleteDialogOpen}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-[#151515] rounded-2xl p-6 w-full max-w-md border border-[#252525] relative">
			<div class="text-lg font-bold text-white mb-4">Delete Your Review</div>
			<p class="text-gray-300 text-sm mb-4">Are you sure you want to delete your review? This action cannot be undone.</p>
			<div class="flex gap-3">
				<button onclick={() => (reviewDeleteDialogOpen = false)} class="flex-1 py-2 px-4 bg-[#252525] text-white rounded-lg hover:bg-[#353535] transition-colors">Cancel</button>
				<button onclick={deleteReview} class="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2">Delete Review</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animation for price changes */
	@keyframes highlight {
		0% {
			background-color: hsl(var(--accent) / 0.5);
		}
		100% {
			background-color: transparent;
		}
	}

	.highlight-animation {
		animation: highlight 1.5s ease-out;
	}
</style>
