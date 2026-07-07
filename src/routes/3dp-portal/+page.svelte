<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import Wrench from '@lucide/svelte/icons/wrench';
	import { toastStore } from '$lib/client/toastStore';
	import ModelViewer from '$lib/components/ModelViewer.svelte';
	import { ScButton, TagBadge, Skeleton } from '$lib/components/sc';
	import {
		PortalCard,
		PortalSectionLabel,
		PortalStepIndicator,
		ConfigSummaryBar,
		PortalModelPreview,
		ParameterChip,
		ReadinessChecklist
	} from '$lib/components/portal';
	import * as Accordion from '$lib/components/ui/accordion';
	import { cn } from '$lib/utils';
	import * as THREE from 'three';
	import AvailableMakers from './AvailableMakers.svelte';

	let { data } = $props();

	// Model upload state
	let dragActive = $state(false);
	let modelLoaded = $state(false);
	let modelFile: File | null = $state(null);
	let loading = $state(false);

	// ThreeJS cube references
	let cubeContainer: HTMLElement | null = $state(null);
	let renderer: THREE.WebGLRenderer | null = $state(null);
	let isHovering = $state(false);

	// Print parameters
	let selectedMaterial: string = $state('PLA');
	let selectedQuality = $state('Standard (0.20mm)');
	let scale = $state(1.0);
	let infill = $state(15); // Default to 40% (3 walls)
	let walls = $state(3);
	const DEFAULT_FILAMENT_COLOR = '#525252';

	let selectedColor = $state(DEFAULT_FILAMENT_COLOR);

	function previewModelColor(color: string): string {
		const normalized = color.trim();
		if (!normalized) return DEFAULT_FILAMENT_COLOR;

		const lower = normalized.toLowerCase();
		if (lower === '#fff' || lower === '#ffffff' || lower === 'white') {
			return DEFAULT_FILAMENT_COLOR;
		}

		if (!normalized.startsWith('#') && /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) {
			return `#${normalized}`;
		}

		return normalized;
	}

	const modelPreviewColor = $derived(previewModelColor(selectedColor));

	// Material options
	const materials = data.filtypes;
	const qualities = ['Draft (0.28mm)', 'Standard (0.20mm)', 'High (0.15mm)'];

	// Strength levels with walls mapping
	const strengthLevels = [
		{ label: 'Light', value: 15, walls: '2 walls' },
		{ label: 'Basic', value: 20, walls: '3 walls' },
		{ label: 'Medium', value: 30, walls: '3 walls' },
		{ label: 'Strong', value: 40, walls: '4 walls' },
		{ label: 'Stronger', value: 50, walls: '5 walls' },
		{ label: 'Heavy', value: 80, walls: '5 walls' },
		{ label: 'Solid', value: 100, walls: '10 walls' }
	];

	// Slider position to strength level mapping
	let sliderPosition = $state(4); // Default to 'Strong' (40%)

	// Map slider position to actual infill percentage
	function updateInfillFromSlider() {
		infill = strengthLevels[sliderPosition].value;
		walls = parseInt(strengthLevels[sliderPosition].walls.split(' ')[0]);
	}

	// Function to get position based on strength level (used for initial value)
	function getPositionFromStrength(value: number) {
		if (value === 15) return 1;
		if (value === 20) return 2;
		if (value === 30) return 3;
		if (value === 40) return 4;
		if (value === 50) return 5;
		if (value === 80) return 6;
		if (value === 100) return 7;
		return 4; // Default to position 4 (Strong)
	}

	// Initialize slider and infill values on mount
	onMount(() => {
		fetchQuoteRequestStats();
		// Initialize slider position based on initial infill value
		sliderPosition = getPositionFromStrength(infill);

		// Use a small delay to ensure DOM elements are fully rendered
		setTimeout(() => {
			if (!modelLoaded && cubeContainer) {
				initThreeCube();
			}
		}, 100);

		// Cleanup on component destroy
		return () => {
			if (renderer) {
				// Cancel animation frame if it exists
				if (cubeContainer && cubeContainer.dataset && cubeContainer.dataset.animationId) {
					try {
						const animId = parseInt(cubeContainer.dataset.animationId);
						if (!isNaN(animId)) {
							cancelAnimationFrame(animId);
						}
					} catch (error) {
						console.error('Error canceling animation frame:', error);
					}
				}

				// Dispose renderer
				renderer.dispose();

				// Remove canvas from DOM
				if (cubeContainer && cubeContainer.firstChild) {
					try {
						cubeContainer.removeChild(cubeContainer.firstChild);
					} catch (error) {
						console.error('Error removing canvas from DOM:', error);
					}
				}
			}
		};
	});

	// Add ModelViewer reference
	let modelViewer: ModelViewer;

	const portalSteps = $derived([
		{ id: 'upload', label: 'Upload', done: modelLoaded },
		{ id: 'configure', label: 'Configure', done: modelLoaded },
		{ id: 'quote', label: 'Request quote', done: false }
	]);

	const currentStep = $derived(modelLoaded ? 'configure' : 'upload');

	const readinessItems = $derived([
		{ label: 'Upload an STL model', done: modelLoaded },
		{ label: 'Set material, quality & strength', done: Boolean(selectedMaterial && selectedQuality) },
		{ label: 'Choose a maker and filament color below', done: false }
	]);

	function replaceModel() {
		browseFiles();
	}

	// Initialize Three.js cube
	function initThreeCube() {
		if (!cubeContainer) {
			console.error('Cube container is null, cannot initialize three.js cube');
			return;
		}

		try {
			// Scene setup
			const scene = new THREE.Scene();

			// Camera setup
			const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
			camera.position.z = 5;

			// Renderer setup with high pixel ratio for crisp display
			renderer = new THREE.WebGLRenderer({
				antialias: true,
				alpha: true
			});

			const size = 234; // Increased by 30% from 180px
			renderer.setSize(size, size);
			renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
			renderer.setClearColor(0x000000, 0);
			cubeContainer.appendChild(renderer.domElement);

			// Cube geometry with slightly beveled edges
			const geometry = new THREE.BoxGeometry(2.6, 2.6, 2.6); // Increased by 30% from 2.0

			const cubeMaterial = new THREE.MeshStandardMaterial({
				color: 0xe5e5e5,
				roughness: 0.85,
				metalness: 0,
				flatShading: true
			});

			const cube = new THREE.Mesh(geometry, cubeMaterial);
			scene.add(cube);

			const edgeGeometry = new THREE.EdgesGeometry(geometry);
			const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x171717 });
			const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
			cube.add(edges);

			const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
			scene.add(ambientLight);

			const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
			directionalLight.position.set(10, 10, 10);
			scene.add(directionalLight);

			let rotationSpeed = 0.005;

			const animate = () => {
				if (!renderer || !scene || !camera || !cube) {
					console.error('Required Three.js objects are missing');
					return;
				}

				try {
					const animationId = requestAnimationFrame(animate);

					if (cubeContainer && cubeContainer.dataset) {
						cubeContainer.dataset.animationId = animationId.toString();
					}

					rotationSpeed = isHovering ? 0.001 : 0.005;
					cube.rotation.x = -0.4;
					cube.rotation.y += rotationSpeed;

					renderer.render(scene, camera);
				} catch (error) {
					console.error('Error in cube animation:', error);
					if (cubeContainer && cubeContainer.dataset && cubeContainer.dataset.animationId) {
						cancelAnimationFrame(parseInt(cubeContainer.dataset.animationId));
					}
				}
			};

			// Start animation
			animate();
		} catch (error) {
			console.error('Error initializing Three.js cube:', error);
		}
	}

	// Handle hover events to affect rotation speed
	function handleCubeMouseEnter() {
		isHovering = true;
	}

	function handleCubeMouseLeave() {
		isHovering = false;
	}

	// Handle file drop
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;

		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFiles(target.files);
		}
	}
	function handleFiles(files: FileList) {
		// Filter for 3D model files
		const supportedFormats = ['.stl'];
		const file = files[0];

		if (file) {
			const fileName = file.name.toLowerCase();
			const isSupported = supportedFormats.some((format) => fileName.endsWith(format));
			const fileSizeMB = file.size / (1024 * 1024);

			if (!isSupported) {
				toastStore.show('Please upload a supported 3D model file (STL)', 'error');
				return;
			}

			if (fileSizeMB > 50) {
				toastStore.show('File size exceeds 50MB limit. Please upload a smaller file.', 'error');
				return;
			}

			modelFile = file;
			modelLoaded = true;
			// Reset file input so same file can be uploaded again
			const fileInput = document.getElementById('fileInput') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
		}
	}

	function browseFiles() {
		const fileInput = document.getElementById('fileInput') as HTMLInputElement;
		fileInput?.click();
	}

	async function isUserMaker() {
		let user = await data.supabase_lt.auth.getUser();
		let userid = '';
		if (!user.error && user.data) {
			userid = user.data.user.id;
		} else return false;

		//
		let maker = await data.supabase_lt.from('PrintingCrafters').select().eq('maker_id', userid);
		if (!maker.error && maker.data && maker.data.length > 0) {
			return true;
		} else return false;
	}

	let requestsLeft : number | null = $state(null);
	let quoteDailyLimit : number | null = $state(null);
	let loadingRequests = $state(true);

	async function fetchQuoteRequestStats() {
		loadingRequests = true;
		const { data: userRes, error: userErr } = await data.supabase_lt.auth.getUser();
		if (userErr || !userRes?.user) {
			requestsLeft = null;
			quoteDailyLimit = null;
			loadingRequests = false;
			return;
		}
		const user_id = userRes.user.id;
		// Get user's daily limit
		const { data: userRow, error: userRowErr } = await data.supabase_lt
			.from('users')
			.select('quote_daily_limit')
			.eq('id', user_id)
			.single();
		quoteDailyLimit = userRow?.quote_daily_limit ?? 3;
		// Get today's printrequests count
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const { count, error: countErr } = await data.supabase_lt
			.from('printrequests')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user_id)
			.gte('created_at', today.toISOString());
		requestsLeft = (quoteDailyLimit ?? 0) - (count ?? 0);
		loadingRequests = false;
	}

	async function requestQuoteCompleter(
		maker_id: string,
		model: File | null,
		color: string,
		material: string,
		quality: string,
		scale: number,
		infill: number,
		walls: number,
		onProgress?: (progress: number | null) => void
	) {
		loading = true;
		if (onProgress) onProgress(0);
		const { data: userRes, error: userErr } = await data.supabase_lt.auth.getSession();
		if(userErr || !userRes?.session?.access_token) {
			toastStore.show('You must be logged in to request a quote', 'error');
			loading = false;
			if (onProgress) onProgress(null);
			return;
		}

		//check if provided file is <50MB and an actual STL file
		if (model && model.size > 50 * 1024 * 1024) {
			toastStore.show('Model file must be less than 50MB', 'error');
			loading = false;
			if (onProgress) onProgress(null);
			return;
		}
		
		const jwt = userRes.session.access_token;

		// Build FormData for edge function
		const formData = new FormData();
		formData.append('maker_id', maker_id);
		formData.append('color', color);
		formData.append('material', material);
		formData.append('quality', quality);
		formData.append('scale', String(scale));
		formData.append('infill', String(infill));
		formData.append('walls', String(walls));
		if (model) formData.append('model_file', model);

		try {
			// Use XMLHttpRequest for upload progress
			const xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://pfeewicqoxkuwnbuxnoz.supabase.co/functions/v1/upload-model-request');
			xhr.setRequestHeader('Authorization', `Bearer ${jwt}`);
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable && onProgress) {
					const percent = Math.round((event.loaded / event.total) * 100);
					onProgress(percent);
				}
			};
			const promise = new Promise<{ok: boolean, json: any}>((resolve, reject) => {
				xhr.onload = () => {
					let json;
					try { json = JSON.parse(xhr.responseText); } catch { json = {}; }
					resolve({ ok: xhr.status >= 200 && xhr.status < 300, json });
				};
				xhr.onerror = () => reject(new Error('Network error'));
			});
			xhr.send(formData);
			const { ok, json: result } = await promise;
			if (!ok) {
				toastStore.show(result.error || 'Failed to create quote request', 'error');
				loading = false;
				if (onProgress) onProgress(null);
				return;
			}
			toastStore.show('Quote request submitted!', 'success');
			await fetchQuoteRequestStats();
		} catch (err) {
			toastStore.show('Unexpected error submitting quote request', 'error');
		} finally {
			loading = false;
			if (onProgress) onProgress(null);
		}
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 pb-16">
		<header class="mb-8 border-b border-border pb-8">
			<TagBadge label="3D Portal" class="mb-3" />
			<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Community 3D Printing</h1>
			<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
				Upload a model, tune your print settings, then request a quote from a maker near you.
			</p>
			<PortalStepIndicator steps={portalSteps} current={currentStep} class="mt-6" />
		</header>

		{#if data.session}
			<PortalCard class="mb-4">
				<PortalSectionLabel label="quote_requests" />
				{#if loadingRequests}
					<div class="space-y-2" aria-hidden="true">
						<Skeleton class="h-9 w-16 rounded-sm" />
						<Skeleton class="h-3 w-48 rounded-sm" />
					</div>
				{:else if requestsLeft !== null && quoteDailyLimit !== null}
					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-semibold tabular-nums text-foreground">{requestsLeft}</span>
						<span class="text-sm text-muted-foreground">of {quoteDailyLimit} left today</span>
					</div>
					<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
						Quote requests are limited while we're a small team — please use them thoughtfully.
					</p>
				{:else}
					<p class="text-sm text-muted-foreground">Sign in to see your quote limit.</p>
				{/if}
			</PortalCard>
		{/if}

		<div class="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-stretch">
			<div class="flex min-h-0 flex-col md:col-span-7">
				<PortalModelPreview
					class="h-full"
					{modelLoaded}
					{modelFile}
					modelColor={modelPreviewColor}
					{selectedMaterial}
					selectedScale={scale}
					selectedInfill={infill}
					{selectedQuality}
					selectedWalls={parseInt(strengthLevels[sliderPosition].walls.split(' ')[0])}
					{dragActive}
					bind:cubeContainer
					bind:modelViewer
					onCubeMouseEnter={handleCubeMouseEnter}
					onCubeMouseLeave={handleCubeMouseLeave}
					onBrowse={browseFiles}
					onFileChange={handleFileInput}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					onReplace={replaceModel}
					onFailedLoad={() => {
						toastStore.show(
							'Sorry, this STL is not compatible with our portal. Please try a different model.',
							'error'
						);
						modelFile = null;
						modelLoaded = false;
					}}
				/>
			</div>

			<div class="flex min-h-0 flex-col md:col-span-5">
				<PortalCard class="flex h-full flex-col">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div class="flex items-center gap-2">
							<Wrench class="size-4 text-muted-foreground" strokeWidth={1.5} />
							<span class="text-sm font-medium text-foreground">Print parameters</span>
						</div>
					</div>

					<ConfigSummaryBar
						material={selectedMaterial}
						quality={selectedQuality}
						{scale}
						strengthLabel={strengthLevels[sliderPosition].label}
						{infill}
						color={selectedColor}
						class="mb-5"
					/>

					<div class="mb-5">
						<PortalSectionLabel label="material" />
						<div class="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
							{#each materials as material}
								<ParameterChip
									selected={selectedMaterial === material}
									onclick={() => {
										selectedMaterial = material;
										selectedColor = DEFAULT_FILAMENT_COLOR;
									}}
								>
									{material}
								</ParameterChip>
							{/each}
						</div>
					</div>

					<div class="mb-5">
						<PortalSectionLabel label="quality" />
						<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
							{#each qualities as quality}
								<ParameterChip
									selected={selectedQuality === quality}
									onclick={() => (selectedQuality = quality)}
								>
									{quality.split(' ')[0]}
								</ParameterChip>
							{/each}
						</div>
					</div>

					<div class="mb-5">
						<div class="mb-2 flex items-center justify-between gap-2">
							<PortalSectionLabel label="scale" class="mb-0" />
							<div class="flex items-center gap-1.5 text-xs tabular-nums">
								{#each [0.5, 1, 1.5, 2] as preset}
									<button
										type="button"
										class={cn(
											'rounded border px-2 py-0.5 transition-colors',
											Math.abs(scale - preset) < 0.01
												? 'border-black bg-black text-white'
												: 'border-border text-muted-foreground hover:border-foreground/30'
										)}
										onclick={() => (scale = preset)}
									>
										{preset}x
									</button>
								{/each}
							</div>
						</div>
						<input
							type="range"
							min="0.5"
							max="2"
							step="0.05"
							bind:value={scale}
							oninput={() => modelViewer?.notifySliderMoving?.()}
							class="portal-range w-full"
						/>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between gap-2">
							<PortalSectionLabel label="strength" class="mb-0" />
							<span class="text-xs tabular-nums text-muted-foreground">
								{strengthLevels[sliderPosition].label} · {infill}%
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="6"
							step="1"
							bind:value={sliderPosition}
							oninput={() => {
								updateInfillFromSlider();
								modelViewer?.notifySliderMoving?.();
							}}
							class="portal-range w-full"
						/>
						<div
							class="pointer-events-none mt-2 flex justify-between text-[11px] text-muted-foreground"
						>
							{#each strengthLevels as level}
								<span class="truncate px-0.5">{level.label}</span>
							{/each}
						</div>
					</div>
				</PortalCard>
			</div>
		</div>

		<div class="mt-10 space-y-6">
			<ReadinessChecklist items={readinessItems} />

			<AvailableMakers
				supabase_lt={data.supabase_lt}
				model={modelFile}
				bind:color={selectedColor}
				bind:material={selectedMaterial}
				quality={selectedQuality}
				{scale}
				{infill}
				{walls}
				requestQuoteCompleter={requestQuoteCompleter}
			/>

			<PortalCard>
				<div class="mb-4 flex items-center gap-2">
					<CircleHelp class="size-4 text-muted-foreground" strokeWidth={1.5} />
					<span class="text-sm font-medium text-foreground">FAQ</span>
				</div>

				<Accordion.Root class="w-full" type="multiple">
					<Accordion.Item value="disclaimer" class="border-b border-border pb-1">
						<Accordion.Trigger
							class="w-full text-left text-sm font-medium text-foreground hover:text-foreground/80"
						>
							Disclaimer
						</Accordion.Trigger>
						<Accordion.Content class="mt-2 text-sm text-muted-foreground">
							<p>
								If you choose to communicate with a crafter and decide to place an order outside
								of this platform, please be aware that you assume full responsibility for that
								order. Any ratings or reviews related to such transactions will also not be
								considered.
							</p>
						</Accordion.Content>
					</Accordion.Item>

					<Accordion.Item value="supports" class="border-b border-border pb-1">
						<Accordion.Trigger
							class="w-full text-left text-sm font-medium text-foreground hover:text-foreground/80"
						>
							How about customization?
						</Accordion.Trigger>
						<Accordion.Content class="mt-2 text-sm text-muted-foreground">
							<p>
								For custom print requests, our Discord server is an excellent resource.
								Additionally, you can utilize the basic chat feature available on the 3dp orders
								page within your profile. After a thorough discussion, the crafter will be able to
								revise the final quote, allowing you to proceed with your order.
							</p>
						</Accordion.Content>
					</Accordion.Item>

					<Accordion.Item value="3mf" class="border-0 pb-1">
						<Accordion.Trigger
							class="w-full text-left text-sm font-medium text-foreground hover:text-foreground/80"
						>
							Why don't you support 3MF?
						</Accordion.Trigger>
						<Accordion.Content class="mt-2 text-sm text-muted-foreground">
							<p>
								Currently, processing 3MF files in the browser is challenging and not fully
								supported due to various bugs. As an alternative, you can use a slicer of your
								choice to convert the 3MF file into a single STL format.
							</p>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</PortalCard>

			{#await isUserMaker() then isMaker}
				{#if !isMaker}
					<PortalCard>
						<div class="mb-4 flex items-center gap-2">
							<Wrench class="size-4 text-muted-foreground" strokeWidth={1.5} />
							<span class="text-sm font-medium text-foreground">Join Fabbly</span>
						</div>

						<div class="space-y-4">
							<p class="text-sm leading-relaxed text-muted-foreground">
								Are you passionate about 3D printing? Join our community of skilled makers and turn
								your expertise into opportunities! Share your skills and connect with designers
								worldwide.
							</p>

							<div class="rounded-md border border-border bg-muted/30 p-4">
								<div class="mb-2 text-xs font-medium text-foreground">Requirements</div>
								<ul class="space-y-2 text-sm text-muted-foreground">
									<li>Active Selfcrafted Account</li>
									<li>Verified ownership of operational 3D printer(s)</li>
								</ul>
							</div>

							{#await data.supabase_lt.auth.getUser() then user}
								<div class="flex flex-wrap items-center justify-between gap-3">
									{#if !user.data.user}
										<span class="text-xs text-muted-foreground">
											Sign in to apply
										</span>
									{:else}
										<span></span>
									{/if}
									<ScButton
										onclick={() => {
											const isLoggedIn = data.session?.user.id;
											if (!isLoggedIn) goto('/user/sign?postLogin=/3dp-portal/maker');
											else goto('/3dp-portal/maker');
										}}
									>
										I want to be part of Fabbly!
									</ScButton>
								</div>
							{/await}
						</div>
					</PortalCard>
				{/if}
			{/await}
		</div>
	</div>
</div>

<style>
	input[type='number'] {
		-moz-appearance: textfield;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.portal-range {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		border-radius: 9999px;
		background: hsl(var(--border));
		outline: none;
		margin: 8px 0;
	}

	.portal-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: hsl(var(--foreground));
		cursor: pointer;
		border: 2px solid white;
	}

	.portal-range::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: hsl(var(--foreground));
		cursor: pointer;
		border: 2px solid white;
	}
</style>
