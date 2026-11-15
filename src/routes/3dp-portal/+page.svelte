<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toastStore } from '$lib/client/toastStore';
	import { mapPrintFilesError, getPrintFilesQuota } from '$lib/client/printFilesApi';
	import ModelViewer from '$lib/components/ModelViewer.svelte';
	import { ScButton, Skeleton } from '$lib/components/sc';
	import {
		PortalCard,
		PortalSectionLabel,
		PortalStepIndicator,
		ConfigSummaryBar,
		PortalModelPreview,
		ParameterChip
	} from '$lib/components/portal';
	import * as Accordion from '$lib/components/ui/accordion';
	import { cn } from '$lib/utils';
	import * as THREE from 'three';
	import AvailableMakers from './AvailableMakers.svelte';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { SeoHead } from '$lib/components/seo';
	import { portalSeo } from '$lib/seo/meta';
	import { absoluteUrl } from '$lib/seo/site';
	import { page } from '$app/state';

	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	// Model upload state
	let dragActive = $state(false);
	let modelLoaded = $state(false);
	let modelFile: File | null = $state(null);

	// ThreeJS cube references
	let cubeContainer: HTMLElement | null = $state(null);
	let renderer: THREE.WebGLRenderer | null = $state(null);
	let isHovering = $state(false);

	// Print parameters
	let selectedMaterial: string = $state('PLA');
	let selectedQuality = $state('Standard (0.20mm)');
	let scale = $state(1.0);
	const DEFAULT_FILAMENT_COLOR = '#525252';

	let selectedColor = $state(DEFAULT_FILAMENT_COLOR);
	/** Name of the maker swatch the customer picked; empty until they pick one. */
	let selectedColorName = $state('');

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
	const materials = Array.isArray(data.filtypes)
		? data.filtypes.filter((material): material is string => typeof material === 'string')
		: [];
	// These strings are sent to the maker as-is, so the layer heights here are the real ones.
	const qualities = ['Draft (0.28mm)', 'Standard (0.20mm)', 'High (0.15mm)'];

	// Strength levels: infill percentage and wall count sent with the request.
	const strengthLevels = [
		{ label: 'Light', value: 15, walls: 2 },
		{ label: 'Basic', value: 20, walls: 3 },
		{ label: 'Medium', value: 30, walls: 3 },
		{ label: 'Strong', value: 40, walls: 4 },
		{ label: 'Stronger', value: 50, walls: 5 },
		{ label: 'Heavy', value: 80, walls: 5 },
		{ label: 'Solid', value: 100, walls: 10 }
	];

	const DEFAULT_STRENGTH_INDEX = strengthLevels.findIndex((level) => level.label === 'Basic');

	// 0-based index into strengthLevels; infill and walls always follow it.
	let sliderPosition = $state(DEFAULT_STRENGTH_INDEX);
	const strength = $derived(
		strengthLevels[sliderPosition] ?? strengthLevels[DEFAULT_STRENGTH_INDEX]
	);
	const infill = $derived(strength.value);
	const walls = $derived(strength.walls);

	// Settings chosen before signing in are kept in sessionStorage so they survive the
	// sign-in round trip. The file itself can't be kept.
	const SETTINGS_KEY = 'scweb:3dp-portal:settings';
	let settingsRestored = $state(false);
	let showReuploadHint = $state(false);

	function restoreSettings() {
		try {
			const raw = sessionStorage.getItem(SETTINGS_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as {
				material?: string;
				quality?: string;
				scale?: number;
				strengthIndex?: number;
				hadModel?: boolean;
			};
			if (saved.material && materials.includes(saved.material)) selectedMaterial = saved.material;
			if (saved.quality && qualities.includes(saved.quality)) selectedQuality = saved.quality;
			if (typeof saved.scale === 'number' && saved.scale >= 0.5 && saved.scale <= 2) {
				scale = saved.scale;
			}
			if (
				typeof saved.strengthIndex === 'number' &&
				saved.strengthIndex >= 0 &&
				saved.strengthIndex < strengthLevels.length
			) {
				sliderPosition = saved.strengthIndex;
			}
			if (data.session) {
				showReuploadHint = Boolean(saved.hadModel);
				sessionStorage.removeItem(SETTINGS_KEY);
			}
		} catch {
			// Ignore unreadable or blocked storage.
		}
	}

	$effect(() => {
		const snapshot = {
			material: selectedMaterial,
			quality: selectedQuality,
			scale,
			strengthIndex: sliderPosition,
			hadModel: modelLoaded
		};
		if (!settingsRestored || data.session) return;
		try {
			sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(snapshot));
		} catch {
			// Ignore blocked storage.
		}
	});

	onMount(() => {
		fetchQuoteRequestStats();
		restoreSettings();
		settingsRestored = true;

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
	let modelViewer = $state<ModelViewer | undefined>(undefined);
	let modelInfo = $state({
		dimensions: { x: 0, y: 0, z: 0 },
		fileSize: '0 KB',
		vertexCount: 0,
		triangleCount: 0,
		isCalculating: false
	});

	// A colour counts as chosen only once the customer has picked a maker's swatch.
	const colourChosen = $derived(
		selectedColorName !== '' && selectedColor !== DEFAULT_FILAMENT_COLOR
	);
	let requestSent = $state(false);

	const portalSteps = $derived([
		{ id: 'upload', label: 'Upload a model', done: modelLoaded },
		{ id: 'maker', label: 'Pick a maker and colour', done: colourChosen },
		{ id: 'quote', label: 'Request a quote', done: requestSent }
	]);

	const currentStep = $derived(
		!modelLoaded ? 'upload' : !colourChosen ? 'maker' : requestSent ? '' : 'quote'
	);

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
		let user = await supabase().auth.getUser();
		let userid = '';
		if (!user.error && user.data) {
			userid = user.data.user.id;
		} else return false;

		//
		let maker = await supabase().from('PrintingCrafters').select('maker_id').eq('maker_id', userid);
		if (!maker.error && maker.data && maker.data.length > 0) {
			return true;
		} else return false;
	}

	let requestsLeft: number | null = $state(null);
	let quoteDailyLimit: number | null = $state(null);
	let loadingRequests = $state(true);

	async function fetchQuoteRequestStats() {
		loadingRequests = true;
		if (!data.session) {
			requestsLeft = null;
			quoteDailyLimit = null;
			loadingRequests = false;
			return;
		}

		const result = await getPrintFilesQuota(fetch);
		if (!result.ok) {
			requestsLeft = null;
			quoteDailyLimit = null;
			loadingRequests = false;
			return;
		}

		quoteDailyLimit = result.data.limit;
		requestsLeft = result.data.remaining;
		loadingRequests = false;
	}

	function dataUrlToBlob(dataUrl: string): Blob | null {
		const [header, base64] = dataUrl.split(',');
		if (!base64) return null;

		const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}

		return new Blob([bytes], { type: mime });
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
		if (onProgress) onProgress(0);
		const { data: userRes, error: userErr } = await supabase().auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('Sign in to request a quote.', 'error');
			if (onProgress) onProgress(null);
			return;
		}

		//check if provided file is <50MB and an actual STL file
		if (model && model.size > 50 * 1024 * 1024) {
			toastStore.show('Model file must be less than 50MB', 'error');
			if (onProgress) onProgress(null);
			return;
		}

		if (!model) {
			toastStore.show('Please select a model file', 'error');
			if (onProgress) onProgress(null);
			return;
		}

		// Build FormData for API upload
		const formData = new FormData();
		formData.append('maker_id', maker_id);
		formData.append('color', color);
		formData.append('material', material);
		formData.append('quality', quality);
		formData.append('scale', String(scale));
		formData.append('infill', String(infill));
		formData.append('walls', String(walls));
		formData.append('model_file', model);

		const previewDataUrl = modelViewer?.capturePreview?.();
		if (previewDataUrl) {
			const previewBlob = dataUrlToBlob(previewDataUrl);
			if (previewBlob) {
				formData.append('preview_image', previewBlob, 'preview.png');
			}
		}

		formData.append(
			'model_stats',
			JSON.stringify({
				dimensions: {
					x: modelInfo.dimensions.x * scale,
					y: modelInfo.dimensions.y * scale,
					z: modelInfo.dimensions.z * scale
				},
				triangleCount: modelInfo.triangleCount
			})
		);

		try {
			// Use XMLHttpRequest for upload progress
			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/api/print-files/upload');
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable && onProgress) {
					const percent = Math.round((event.loaded / event.total) * 100);
					onProgress(percent);
				}
			};
			const promise = new Promise<{ ok: boolean; status: number; json: unknown }>(
				(resolve, reject) => {
					xhr.onload = () => {
						let json: unknown;
						try {
							json = JSON.parse(xhr.responseText);
						} catch {
							json = {};
						}
						resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
					};
					xhr.onerror = () => reject(new Error('Network error'));
				}
			);
			xhr.send(formData);
			const { ok, status, json } = await promise;
			if (!ok) {
				const error = mapPrintFilesError(status, json);
				toastStore.show(error.message, 'error');
				if (onProgress) onProgress(null);
				return;
			}
			requestSent = true;
			const newId = (json as { printRequest?: { id?: unknown } })?.printRequest?.id;
			if (typeof newId === 'string' && newId) {
				toastStore.show('Quote request sent to the maker.', 'success');
				await goto(resolve('/3dp-portal/(authenticated)/user/[id]', { id: newId }));
				return;
			}
			toastStore.show('Quote request sent. Find it under My print requests.', 'success');
			await fetchQuoteRequestStats();
		} catch {
			toastStore.show("Couldn't send your quote request. Try again.", 'error');
		} finally {
			if (onProgress) onProgress(null);
		}
	}
</script>

<SeoHead meta={{ ...portalSeo, canonical: absoluteUrl('/3dp-portal', page.url.origin) }} />

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 pb-16">
		<header class="mb-8 border-b border-border pb-8">
			<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">3D printing</h1>
			<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
				Upload an STL, choose a material and print settings, then ask a maker for a quote.
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
						Quote requests are limited while we're a small team, so please use them thoughtfully.
						The limit resets daily.
					</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						Couldn't load your quote limit. Refresh to try again.
					</p>
				{/if}
				{#if showReuploadHint && !modelLoaded}
					<p class="mt-3 text-sm text-foreground">
						Your settings were kept. Upload your model again to continue.
					</p>
				{/if}
			</PortalCard>
		{:else}
			<PortalCard class="mb-4">
				<p class="text-sm text-foreground">You need a Selfcrafted account to request a quote.</p>
				<p class="mt-1 text-sm text-muted-foreground">
					You can upload a model and try settings first. Your settings are kept when you sign in,
					but you'll need to upload the model again.
				</p>
				<div class="mt-3">
					<ScButton href="/user/sign?postLogin={encodeURIComponent('/3dp-portal')}"
						>Sign in</ScButton>
				</div>
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
					selectedWalls={walls}
					{dragActive}
					bind:cubeContainer
					bind:modelViewer
					bind:modelInfo
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
							"We couldn't read this STL. Re-export it as a binary STL from your CAD or slicer, or check that it isn't empty or corrupted.",
							'error'
						);
						modelFile = null;
						modelLoaded = false;
					}} />
			</div>

			<div class="flex min-h-0 flex-col md:col-span-5">
				<PortalCard class="flex h-full flex-col">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div class="flex items-center gap-2">
							<Icon icon={F.wrench} class="size-4 text-muted-foreground" />
							<span class="text-sm font-medium text-foreground">Print parameters</span>
						</div>
					</div>

					<ConfigSummaryBar
						material={selectedMaterial}
						quality={selectedQuality}
						{scale}
						strengthLabel={strength.label}
						{infill}
						color={selectedColor}
						colorName={colourChosen ? selectedColorName : ''}
						class="mb-5" />

					<div class="mb-5">
						<PortalSectionLabel label="material" />
						<div class="grid grid-cols-3 gap-1.5 sm:grid-cols-5" role="group" aria-label="Material">
							{#each materials as material (material)}
								<ParameterChip
									selected={selectedMaterial === material}
									onclick={() => {
										selectedMaterial = material;
										selectedColor = DEFAULT_FILAMENT_COLOR;
										selectedColorName = '';
									}}>
									{material}
								</ParameterChip>
							{/each}
						</div>
						<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
							PLA is easy to print and good for indoor parts. PETG is tougher and copes better with
							heat and outdoor use. TPU is flexible.
						</p>
					</div>

					<div class="mb-5">
						<PortalSectionLabel label="quality" />
						<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-3" role="group" aria-label="Quality">
							{#each qualities as quality (quality)}
								<ParameterChip
									selected={selectedQuality === quality}
									onclick={() => (selectedQuality = quality)}>
									{quality.split(' ')[0]}
								</ParameterChip>
							{/each}
						</div>
						<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
							Thinner layers look smoother but take longer to print. Draft 0.28 mm, Standard 0.20
							mm, High 0.15 mm.
						</p>
					</div>

					<div class="mb-5">
						<div class="mb-2 flex items-center justify-between gap-2">
							<PortalSectionLabel label="scale" class="mb-0" />
							<div class="flex items-center gap-1.5 text-xs tabular-nums">
								{#each [0.5, 1, 1.5, 2] as preset (preset)}
									<button
										type="button"
										class={cn(
											'rounded border px-2 py-0.5 transition-colors',
											Math.abs(scale - preset) < 0.01
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border text-muted-foreground hover:border-foreground/30'
										)}
										onclick={() => (scale = preset)}>
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
							aria-label="Scale"
							aria-valuetext="{scale.toFixed(2)} times"
							bind:value={scale}
							oninput={() => modelViewer?.notifySliderMoving?.()}
							class="portal-range w-full" />
						<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
							Makes the whole model bigger or smaller. 1x prints it at the size in the file.
						</p>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between gap-2">
							<PortalSectionLabel label="strength" class="mb-0" />
							<span class="text-xs tabular-nums text-muted-foreground">
								{strength.label} · {infill}% infill · {walls} walls
							</span>
						</div>
						<input
							type="range"
							min="0"
							max={strengthLevels.length - 1}
							step="1"
							aria-label="Strength"
							aria-valuetext="{strength.label}, {infill}% infill, {walls} walls"
							bind:value={sliderPosition}
							oninput={() => modelViewer?.notifySliderMoving?.()}
							class="portal-range w-full" />
						<div
							class="pointer-events-none mt-2 flex justify-between text-xs text-muted-foreground"
							aria-hidden="true">
							<span>{strengthLevels[0].label}</span>
							<span>{strengthLevels[strengthLevels.length - 1].label}</span>
						</div>
						<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
							How solid the inside is. Basic is fine for display parts. Pick Strong or higher for
							parts that take load, like brackets.
						</p>
					</div>
				</PortalCard>
			</div>
		</div>

		<div class="mt-10 space-y-6">
			<AvailableMakers
				currentUserId={data.session?.user?.id ?? ''}
				model={modelFile}
				bind:color={selectedColor}
				bind:colorName={selectedColorName}
				bind:material={selectedMaterial}
				quality={selectedQuality}
				{scale}
				{infill}
				{walls}
				{requestQuoteCompleter} />

			<PortalCard>
				<div class="mb-4 flex items-center gap-2">
					<Icon icon={F.questionCircle} class="size-4 text-muted-foreground" />
					<span class="text-sm font-medium text-foreground">FAQ</span>
				</div>

				<Accordion.Root class="w-full" type="multiple">
					<Accordion.Item value="disclaimer" class="border-b border-border pb-1">
						<Accordion.Trigger
							class="w-full text-left text-sm font-medium text-foreground hover:text-foreground/80">
							What if I deal with a maker outside Selfcrafted?
						</Accordion.Trigger>
						<Accordion.Content class="mt-2 text-sm text-muted-foreground">
							<p>
								Then the order is between you and them. We can't help with refunds or disputes for
								it, and it won't count towards the maker's ratings or reviews.
							</p>
						</Accordion.Content>
					</Accordion.Item>

					<Accordion.Item value="supports" class="border-b border-border pb-1">
						<Accordion.Trigger
							class="w-full text-left text-sm font-medium text-foreground hover:text-foreground/80">
							Can I ask for changes or a custom job?
						</Accordion.Trigger>
						<Accordion.Content class="mt-2 text-sm text-muted-foreground">
							<p>
								Yes. Once you've requested a quote you can message the maker from the request page,
								and they can change the quote before you pay. For bigger custom jobs, ask on our
								Discord.
							</p>
						</Accordion.Content>
					</Accordion.Item>

					<Accordion.Item value="3mf" class="border-0 pb-1">
						<Accordion.Trigger
							class="w-full text-left text-sm font-medium text-foreground hover:text-foreground/80">
							Why only STL?
						</Accordion.Trigger>
						<Accordion.Content class="mt-2 text-sm text-muted-foreground">
							<p>
								Our in-browser preview can't read 3MF files reliably yet. Export a single STL from
								your slicer or CAD tool and upload that.
							</p>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</PortalCard>

			{#await isUserMaker() then isMaker}
				{#if !isMaker}
					<PortalCard>
						<div class="mb-4 flex items-center gap-2">
							<Icon icon={F.wrench} class="size-4 text-muted-foreground" />
							<span class="text-sm font-medium text-foreground">Own a 3D printer?</span>
						</div>

						<div class="space-y-4">
							<p class="text-sm leading-relaxed text-muted-foreground">
								Makers on Selfcrafted take print jobs through this page. You list the filament you
								have in stock, buyers send you a model, and you quote a price.
							</p>

							<div class="rounded-md border border-border bg-muted/30 p-4">
								<div class="mb-2 text-xs font-medium text-foreground">What you need</div>
								<ul class="space-y-2 text-sm text-muted-foreground">
									<li>A Selfcrafted account</li>
									<li>A working 3D printer</li>
								</ul>
							</div>

							{#await supabase().auth.getUser() then user}
								<div class="flex flex-wrap items-center justify-between gap-3">
									{#if !user.data.user}
										<span class="text-xs text-muted-foreground"> Sign in to apply </span>
									{:else}
										<span></span>
									{/if}
									<!-- /portal/printing sends non-makers to the maker application and tells
										approved makers without printing how to add it. -->
									<ScButton
										href={data.session?.user.id
											? '/portal/printing'
											: `/user/sign?postLogin=${encodeURIComponent('/portal/printing')}`}>
										Apply to offer 3D printing
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
