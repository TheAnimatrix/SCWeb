<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getContext, onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toastStore } from '$lib/client/toastStore'; // Import custom toast store
	import * as Tabs from '$lib/components/ui/tabs';
	import ModelViewer from '$lib/components/ModelViewer.svelte';
	import * as THREE from 'three';
	import * as Accordion from '$lib/components/ui/accordion';
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
	let selectedColor = $state('#fff'); // Green default

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

			// Dark gray material for cube faces
			const darkMaterial = new THREE.MeshStandardMaterial({
				color: 0x1a1a2e,
				roughness: 0.9,
				metalness: 0,
				flatShading: true
			});

			// Create the main cube
			const cube = new THREE.Mesh(geometry, darkMaterial);
			scene.add(cube);

			// Edge geometry for colored borders
			const edgeGeometry = new THREE.EdgesGeometry(geometry);

			// Create a shader material for glowing edges
			const glowEdgeShader = {
				uniforms: {
					time: { value: 0 }
				},
				vertexShader: `
					varying vec3 vPosition;
					void main() {
						vPosition = position;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					}
				`,
				fragmentShader: `
					uniform float time;
					varying vec3 vPosition;
					
					vec3 colorA = vec3(0.4, 0.6, 0.9);  // Blue
					vec3 colorB = vec3(0.3, 0.5, 0.8);  // Darker blue
					vec3 colorC = vec3(0.5, 0.7, 1.0);  // Lighter blue
					
					void main() {
						float t = sin(time * 0.5) * 0.5 + 0.5;
						float pos = vPosition.x + vPosition.y + vPosition.z;
						float normalizedPos = fract(pos * 0.3 + time * 0.1);
						
						vec3 color1 = mix(colorA, colorB, normalizedPos);
						vec3 color2 = mix(colorB, colorC, normalizedPos);
						vec3 finalColor = mix(color1, color2, t);
						
						float glow = pow(sin(time * 0.5) * 0.5 + 0.5, 2.0) * 0.3 + 0.7;
						gl_FragColor = vec4(finalColor * glow, 1.0);
					}
				`
			};

			// Create edge material
			const edgeMaterial = new THREE.ShaderMaterial({
				uniforms: glowEdgeShader.uniforms,
				vertexShader: glowEdgeShader.vertexShader,
				fragmentShader: glowEdgeShader.fragmentShader,
				transparent: true,
				linewidth: 2
			});

			// Create edges and add to scene
			const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
			cube.add(edges);

			// Add subtle ambient light
			const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
			scene.add(ambientLight);

			// Add directional light
			const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
			directionalLight.position.set(10, 10, 10);
			scene.add(directionalLight);

			// Add point lights for dramatic lighting
			const pointLight1 = new THREE.PointLight(0x6366f1, 0.8, 40); // Indigo-400
			pointLight1.position.set(2, 2, 2);
			scene.add(pointLight1);

			const pointLight2 = new THREE.PointLight(0x4f46e5, 0.8, 70); // Indigo-600
			pointLight2.position.set(-2, -2, 2);
			scene.add(pointLight2);

			// Add subtle shadows
			renderer.shadowMap.enabled = true;
			directionalLight.castShadow = true;

			// Variables for smooth animation
			let rotationSpeed = 0.005;
			let time = 0;

			// Animation loop
			const animate = () => {
				if (!renderer || !scene || !camera || !cube || !edgeMaterial?.uniforms?.time) {
					console.error('Required Three.js objects are missing');
					return;
				}

				try {
					const animationId = requestAnimationFrame(animate);

					// Store the animation ID for cleanup only if container exists
					if (cubeContainer && cubeContainer.dataset) {
						cubeContainer.dataset.animationId = animationId.toString();
					}

					// Update time uniform for edge shader
					time += 0.03;
					edgeMaterial.uniforms.time.value = time;

					// Adjust rotation speed based on hover state
					rotationSpeed = isHovering ? 0.001 : 0.005;

					// Apply rotation
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

	function goBack() {
		window.history.back();
	}

	function addToCart() {
		// Placeholder for add to cart functionality
		alert('Item added to cart!');
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

<div class="w-full flex justify-center min-h-screen">
	<div class="w-full max-w-7xl px-4 relative z-10">
		<div class="text-center mb-8">
			<div class="text-3xl font-bold mb-2">Community 3D Printing</div>
			<p class="text-gray-400 max-w-2xl mx-auto text-sm">
				Upload your 3D model and connect with skilled makers in our community who will bring your
				design to life.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
			<!-- Left panel: Model upload and parameters -->
			<div class="lg:col-span-7">
				<!-- Model preview area -->
				<div
					class="bg-black/60 border border-accent/15 rounded-lg mb-4 h-80 flex flex-col backdrop-blur-md relative overflow-hidden shadow-glow">
					<div class="cube-glow-effect"></div>
					{#if modelLoaded}
						<div class="flex-1 flex flex-col items-center justify-center relative">
							<ModelViewer
								bind:this={modelViewer}
								file={modelFile}
								modelColor={selectedColor}
								{selectedMaterial}
								selectedScale={scale}
								selectedInfill={infill}
								{selectedQuality}
								selectedWalls={parseInt(strengthLevels[sliderPosition].walls.split(' ')[0])}
								onFailedLoad={() => {
									toastStore.show('Sorry, this STL is not compatible with our portal. Please try a different model.', 'error');
									modelFile = null;
									modelLoaded = false;
								}} />
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center h-full">
							<div class="text-center flex flex-col items-center">
								<!-- Three.js cube container -->
								<button
									bind:this={cubeContainer}
									class="cube-container"
									onmouseenter={handleCubeMouseEnter}
									onmouseleave={handleCubeMouseLeave}>
								</button>

								<div class="absolute bottom-6 left-0 right-0 text-center">
									<div class="text-lg font-semibold text-white mb-2 glow-text">No Model Loaded</div>
									<p class="text-white/60 text-sm px-8">Upload a 3D model to see preview</p>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Upload area / Drag & drop -->
				<button
					class="w-full bg-black/40 border-2 border-dashed rounded-lg mb-4 p-4 flex flex-col items-center justify-center text-center backdrop-blur-xs shadow-glow-subtle transition-all duration-300 {dragActive
						? 'border-accent shadow-glow-active'
						: 'border-accent/15'}"
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					onclick={browseFiles}
					ondrop={handleDrop}>
					<div class="flex items-center gap-3">
						<Icon icon="material-symbols:upload" class="text-2xl text-accent icon-glow" />
						<div class="text-left">
							<div class="text-white font-medium text-sm">Drag & drop your 3D model file</div>
							<div class="flex items-center mt-1">
								<div
									class="text-accent text-xs underline hover:text-accent/80 transition-colors">
									or click to browse
								</div>
								<span class="mx-2 text-white/30 text-xs">•</span>
								<span class="text-white/50 text-xs">STL (max 50MB)</span>
							</div>
						</div>
					</div>
					<input
						type="file"
						id="fileInput"
						accept=".stl"
						onchange={handleFileInput}
						class="hidden" />
				</button>

				<!-- Print Parameters -->
				<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle border border-accent/15">
					<div class="flex items-center mb-4">
						<Icon
							icon="material-symbols:build-outline"
							class="text-xl text-accent mr-2 icon-glow" />
						<div class="text-lg font-medium text-white glow-text-subtle">Print Parameters</div>
					</div>

					<!-- Material Selection -->
					<div class="mb-5">
						<label class="text-white/80 text-sm mb-2 block"> Material </label>
						<div class="grid grid-cols-5 gap-1">
							{#each materials as material}
								<button
									class="animate_base py-2 text-center text-sm transition-colors hover:bg-accent/20 rounded {selectedMaterial ===
									material
										? 'bg-accent/10 text-accent hover:bg-accent/20'
										: 'bg-black-800/70 text-accent hover:bg-black-700/80'}"
									onclick={() => {selectedMaterial = material; selectedColor = '#fff';}}>{material}</button>
							{/each}
						</div>
					</div>

					<!-- Quality Selection -->
					<div class="mb-5">
						<label class="text-white/80 text-sm mb-2 block"> Quality </label>
						<div class="grid grid-cols-3 gap-1">
							{#each qualities as quality}
								<button
									class="py-2 text-center text-sm hover:bg-accent/20 animate_base transition-colors rounded {selectedQuality ===
									quality
										? 'bg-accent/10 text-accent hover:bg-accent/20'
										: 'bg-black-800/70 text-accent hover:bg-black-700/80'}"
									onclick={() => (selectedQuality = quality)}>{quality}</button>
							{/each}
						</div>
					</div>

					<!-- Scale Slider -->
					<div class="mb-5">
						<div class="flex justify-between items-center mb-1">
							<label class="text-white/80 text-sm"
								>Scale: <span class="text-white">{scale.toFixed(2)}x</span></label>
							<div class="flex items-center text-white/60 text-xs">
								<button onclick={() => (scale = 1)}>1x</button>
								<span class="mx-2 text-white/30">|</span>
								<button onclick={() => (scale = 2)}>2x</button>
							</div>
						</div>
						<div class="relative">
							<input
								type="range"
								min="0.5"
								max="2"
								step="0.05"
								bind:value={scale}
								oninput={() => modelViewer?.notifySliderMoving?.()}
								class="w-full bg-accent bg-black-800 h-2 rounded appearance-none" />
							<div
								class="absolute top-0 left-0 right-0 flex justify-between px-1 -mt-1 pointer-events-none">
								<div class="w-0.5 h-2 bg-white/20"></div>
								<div class="w-0.5 h-2 bg-white/20"></div>
								<div class="w-0.5 h-2 bg-white/20"></div>
							</div>
						</div>
					</div>

					<!-- Strength (Infill) Slider -->
					<div class="mb-5">
						<div class="flex justify-between items-center mb-1">
							<label class="text-white/80 text-sm">
								Strength: <span class="text-white">
									{strengthLevels[sliderPosition].label}
								</span>
							</label>
							<div class="text-white/60 text-xs">
								{infill}% infill {strengthLevels[sliderPosition].walls !== 'Full'
									? strengthLevels[sliderPosition].walls
									: ''}
							</div>
						</div>
						<div class="relative">
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
								class="w-full bg-accent bg-black-800 h-2 rounded appearance-none" />
							<!-- Visual progress indicator -->
							<div
								class="absolute top-3 left-0 right-0 flex justify-between text-[10px] text-white/50 pointer-events-none">
								{#each Array(7) as _, i}
									<div class="flex flex-col items-start" style="width: 1%">
										<div class="w-0.5 h-2 bg-white/20 mb-1"></div>
										<span class="text-center">{strengthLevels[i].label}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Right panel: Available Makers -->
			<div class="lg:col-span-5">
				<!-- Quote Requests Available Section -->
				{#if data.session}
				<div class="bg-gradient-to-r from-accent/5 via-black/40 to-accent/5 border border-accent/10 rounded-lg p-4 mb-4 flex items-center gap-4 shadow-glow-subtle">
					<div class="flex items-center justify-center w-12 h-12 rounded-full bg-accent/20">
						<Icon icon="material-symbols:request-quote" class="text-3xl text-accent icon-glow" />
					</div>
					<div class="flex-1">
						<div class="text-lg font-semibold text-accent glow-text">Quote Requests</div>
						{#if loadingRequests}
							<div class="text-white/80 text-sm">Loading...</div>
						{:else if requestsLeft !== null && quoteDailyLimit !== null}
							<div class="text-white/80 text-sm">
								You have <span class="font-bold text-accent">{requestsLeft}</span> quote request{requestsLeft === 1 ? '' : 's'} available today
								<span class="text-white/40">/ {quoteDailyLimit} max</span>
							</div>
						{:else}
							<div class="text-white/80 text-sm">Unable to determine your quote request limit</div>
						{/if}
						<div class="text-xs text-gray-400 mt-1">We are a very small unfunded team, so please be frugal with your requests. Thank you!</div>
					</div>
				</div>
				{/if}
				<AvailableMakers supabase_lt={data.supabase_lt} model={modelFile} bind:color={selectedColor} bind:material={selectedMaterial} quality={selectedQuality} {scale} {infill} walls={walls} requestQuoteCompleter={requestQuoteCompleter} />
				<!-- FAQ Section -->
				<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle border border-accent/15">
					<div class="text-lg font-medium text-white mb-4 flex items-center">
						<Icon icon="material-symbols:quiz" class="text-accent mr-2 icon-glow" />
						<span class="glow-text-subtle">Frequently Asked Questions</span>
					</div>

					<Accordion.Root class="w-full" type="multiple">
						<Accordion.Item value="disclaimer" class="border-b border-zinc-800/50 pb-1">
							<Accordion.Trigger
								class="font-medium hover:text-accent text-sm text-white w-full text-left">
								Disclaimer
							</Accordion.Trigger>
							<Accordion.Content class="text-white/70 text-sm mt-2">
								<p>
									If you choose to communicate with a crafter and decide to place an order outside
									of this platform, please be aware that you assume full responsibility for that
									order. Any ratings or reviews related to such transactions will also not be
									considered.
								</p>
							</Accordion.Content>
						</Accordion.Item>

						<Accordion.Item value="supports" class="border-b border-zinc-800/50 pb-1">
							<Accordion.Trigger
								class="font-medium hover:text-accent text-sm text-white w-full text-left">
								How about customization?
							</Accordion.Trigger>
							<Accordion.Content class="text-white/70 text-sm mt-2">
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
								class="font-medium hover:text-accent text-sm text-white w-full text-left">
								Why don't you support 3MF?
							</Accordion.Trigger>
							<Accordion.Content class="text-white/70 text-sm mt-2">
								<p>
									Currently, processing 3MF files in the browser is challenging and not fully
									supported due to various bugs. As an alternative, you can use a slicer of your
									choice to convert the 3MF file into a single STL format.
								</p>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion.Root>
				</div>

				<!-- Become a Maker Section -->
				{#await isUserMaker() then isMaker}
					{#if !isMaker}
						<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle mt-4">
							<div class="text-lg font-medium text-white mb-4 flex items-center">
								<Icon icon="material-symbols:engineering" class="text-accent mr-2 icon-glow" />
								<span class="glow-text-subtle">Join the Fabbly Portal!</span>
							</div>

							<div class="space-y-4">
								<div class="text-white/80 text-sm leading-relaxed">
									<p class="mb-3">
										Are you passionate about 3D printing? Join our community of skilled makers and
										turn your expertise into opportunities! Share your skills and connect with
										designers worldwide.
									</p>

									<div class="bg-black/30 rounded-lg p-3 mb-4">
										<div class="font-medium text-white mb-2">Requirements:</div>
										<ul class="list-none space-y-2">
											<li class="flex items-center text-white/70">
												<Icon
													icon="material-symbols:check-circle-outline"
													class="text-accent mr-2" />
												<span>Active Selfcrafted Account</span>
											</li>
											<li class="flex items-center text-white/70">
												<Icon
													icon="material-symbols:check-circle-outline"
													class="text-accent mr-2" />
												<span>Verified ownership of operational 3D printer(s)</span>
											</li>
										</ul>
									</div>
								</div>

								{#await data.supabase_lt.auth.getUser() then user}
									<div class="flex items-center justify-between">
										<div class="text-white/60 text-sm">
											{#if !user.data.user}
												<span class="flex items-center">
													<Icon icon="material-symbols:info-outline" class="mr-1" />
													Login required to apply
												</span>
											{/if}
										</div>
										<button
											class="bg-accent-dark/60 hover:bg-accent/60 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded text-sm flex items-center gap-2 transition-colors"
											onclick={() => {
												let isLoggedIn = data.session?.user.id;
												if (!isLoggedIn) goto('/user/sign?postLogin=/3dp-portal/maker');
												else goto('/3dp-portal/maker');
											}}>
											<Icon icon="material-symbols:handyman" />
											I want to be part of Fabbly!
										</button>
									</div>
								{/await}
							</div>
						</div>
					{/if}
				{/await}
			</div>
			<div class="h-[100px] w-[1px] bg-transparent"></div>
		</div>
	</div>
</div>

<style>
	/* Firefox hides the up/down arrow buttons */
	input[type='number'] {
		-moz-appearance: textfield;
	}

	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Range input styling for better cross-browser compatibility */
	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		height: 8px !important;
		background: hsla(205, 13%, 23%, 0.8) !important;
		border-radius: 8px;
		outline: none;
		margin: 12px 0;
		position: relative;
		transition: all 0.3s ease;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: hsl(205, 91%, 60%);
		cursor: pointer;
		box-shadow: 0 0 12px 3px hsla(205, 91%, 60%, 0.4);
		border: 3px solid white;
		transition: all 0.2s ease;
	}

	input[type='range']::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: hsl(205, 91%, 60%);
		cursor: pointer;
		box-shadow: 0 0 12px 3px hsla(205, 91%, 60%, 0.4);
		border: 3px solid white;
		transition: all 0.2s ease;
	}

	input[type='range']:hover::-webkit-slider-thumb {
		transform: scale(1.1);
		box-shadow: 0 0 15px 4px hsla(205, 83%, 67%, 0.5);
	}

	input[type='range']:active::-webkit-slider-thumb {
		transform: scale(0.95);
	}

	/* Slider Track Progress */
	input[type='range']::-webkit-slider-runnable-track {
		height: 8px;
		border-radius: 8px;
		background: linear-gradient(90deg, hsla(205, 83%, 67%, 0.6) 0%, hsla(205, 99%, 85%, 0.4) 100%);
	}

	input[type='range']::-moz-range-progress {
		background: linear-gradient(90deg, hsla(205, 91%, 60%, 0.6) 0%, hsla(205, 91%, 60%, 0.4) 100%);
		height: 8px;
		border-radius: 8px;
	}

	/* Styles for the 3D cube container */
	.cube-container {
		width: 234px;
		height: 234px;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: all 0.3s ease;
		margin-bottom: 10px;
	}

	.cube-container canvas {
		display: block;
		border-radius: 4px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	/* Gradient background effects */
	.gradient-background {
		background: linear-gradient(to bottom right, #0a0a12, #0f0f1a, #0a0a12);
		position: relative;
		overflow: hidden;
		min-height: 100vh;
	}

	.gradient-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background:
			radial-gradient(circle at 15% 20%, hsla(205, 51%, 54%, 0.2) 0%, transparent 45%),
			radial-gradient(circle at 85% 70%, hsla(0, 60%, 56%, 0.05) 0%, transparent 45%),
			radial-gradient(circle at 50% 50%, hsla(0, 0%, 0%, 0.3) 0%, hsla(0, 0%, 0%, 0.6) 100%),
			linear-gradient(
				45deg,
				hsla(205, 96%, 67%, 0.05) 0%,
				hsla(0, 0%, 0%, 0) 40%,
				hsla(205, 60%, 59%, 0.05) 100%
			);
		pointer-events: none;
		z-index: 1;
		animation: pulse-subtle 15s infinite alternate ease-in-out;
	}

	/* Ambient orbs */
	.ambient-orbs {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		z-index: 0;
	}

	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.12;
	}

	.orb-1 {
		width: 450px;
		height: 450px;
		background: radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%);
		top: 5%;
		left: 10%;
		animation: float-orb 20s infinite alternate ease-in-out;
	}

	.orb-2 {
		width: 550px;
		height: 550px;
		background: radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%);
		bottom: 5%;
		right: 10%;
		animation: float-orb 25s infinite alternate-reverse ease-in-out;
	}

	.orb-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
		top: 40%;
		right: 25%;
		animation: float-orb 18s infinite alternate ease-in-out 5s;
	}

	@keyframes float-orb {
		0% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(30px, 30px) scale(1.1);
		}
		100% {
			transform: translate(-30px, -30px) scale(1);
		}
	}

	@keyframes pulse-subtle {
		0% {
			opacity: 0.8;
		}
		100% {
			opacity: 1;
		}
	}

	/* Cube effects */
	.cube-container {
		width: 234px;
		height: 234px;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: all 0.3s ease;
		margin-bottom: 10px;
	}

	.cube-container canvas {
		display: block;
		border-radius: 4px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	.cube-glow-effect {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 400px;
		height: 400px;
		background: radial-gradient(
			circle,
			rgba(99, 102, 241, 0.08) 0%,
			rgba(79, 70, 229, 0.06) 50%,
			transparent 70%
		);
		filter: blur(40px);
		opacity: 0.8;
		pointer-events: none;
		z-index: 0;
		animation: pulse-glow 8s infinite alternate ease-in-out;
	}

	@keyframes pulse-glow {
		0% {
			opacity: 0.6;
			width: 380px;
			height: 380px;
		}
		100% {
			opacity: 0.9;
			width: 420px;
			height: 420px;
		}
	}

	/* Text and icon glows */
	.glow-text {
		text-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
	}

	.glow-text-subtle {
		text-shadow: 0 0 8px rgba(99, 102, 241, 0.1);
	}

	.icon-glow {
		filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.5));
	}

	.text-sccyan {
		color: var(--color-accent);
		text-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
	}

	/* Shadow effects */
	.shadow-glow {
		box-shadow:
			0 0 20px rgba(0, 0, 0, 0.3),
			0 0 30px rgba(99, 102, 241, 0.1);
	}

	.shadow-glow-subtle {
		box-shadow:
			0 0 15px rgba(0, 0, 0, 0.2),
			0 0 20px rgba(99, 102, 241, 0.03);
	}

	.shadow-glow-active {
		box-shadow:
			0 0 20px rgba(0, 0, 0, 0.3),
			0 0 30px rgba(99, 102, 241, 0.2);
	}

	/* Enhanced blur effects */
	.backdrop-blur-xs {
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.backdrop-blur-md {
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
</style>
