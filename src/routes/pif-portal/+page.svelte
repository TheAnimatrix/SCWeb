<!-- @migration-task Error while migrating Svelte code: `<button>` cannot be a descendant of `<button>`. The browser will 'repair' the HTML (by moving, removing, or inserting elements) which breaks Svelte's assumptions about the structure of your components.
https://svelte.dev/e/node_invalid_placement -->
<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getContext, onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import ModelViewer from '$lib/components/ModelViewer.svelte';
	import * as THREE from 'three';
	import * as Accordion from '$lib/components/ui/accordion';

	export let data;

	// Model upload state
	let dragActive = false;
	let modelLoaded = false;
	let modelFile: File | null = null;
	let loading = false;

	// ThreeJS cube references
	let cubeContainer: HTMLElement;
	let renderer: THREE.WebGLRenderer;
	let isHovering = false;

	// Available makers data
	const makers = [
		{
			id: 1,
			name: 'Animatrix',
			icon: 'mdi:tiger',
			iconColor: '#ffcc33',
			rating: 4.9,
			printers: 2,
			completedJobs: 253,
			location: 'Chennai',
			printerModels: [
				{
					name: 'Ratrig Vcore 3',
					resolution: '220x220',
					delivery: '1-2 days',
					price: 25,
					materials: ['PLA', 'PETG', 'TPU']
				}
			]
		},
		{
			id: 2,
			name: 'RhinoWorks',
			icon: 'mdi:rhino',
			iconColor: '#6b9bff',
			rating: 4.8,
			printers: 1,
			completedJobs: 178,
			printerModels: []
		},
		{
			id: 3,
			name: 'PeacockPrints',
			icon: 'mdi:bird',
			iconColor: '#33cc99',
			rating: 5.0,
			printers: 2,
			completedJobs: 412,
			printerModels: []
		},
		{
			id: 4,
			name: 'OspreyLabs',
			icon: 'mdi:bird',
			iconColor: '#5572d9',
			rating: 4.7,
			printers: 1,
			completedJobs: 97,
			printerModels: []
		},
		{
			id: 5,
			name: 'BuzzyBee3D',
			icon: 'mdi:bee',
			iconColor: '#ffd633',
			rating: 4.6,
			printers: 1,
			completedJobs: 64,
			printerModels: []
		}
	];

	// Print parameters
	let selectedMaterial: 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'NYLON' = 'PLA';
	let selectedQuality = 'Standard (0.20mm)';
	let scale = 1.0;
	let infill = 15; // Default to 40% (3 walls)
	let selectedColor = '#00FF00'; // Green default

	// Material options
	const materials = ['PLA', 'ABS', 'PETG', 'TPU', 'NYLON'] as const;
	const qualities = ['Draft (0.28mm)', 'Standard (0.20mm)', 'High (0.15mm)'];
	const colors = ['#090909', '#FF4500', '#00FF00', '#0066FF', '#FFFF00', '#FF33FF'];

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
	let sliderPosition = 4; // Default to 'Strong' (40%)
	
	// Map slider position to actual infill percentage
	function updateInfillFromSlider() {
		infill = strengthLevels[sliderPosition].value;
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
						console.error("Error canceling animation frame:", error);
					}
				}
				
				// Dispose renderer
				renderer.dispose();
				
				// Remove canvas from DOM
				if (cubeContainer && cubeContainer.firstChild) {
					try {
						cubeContainer.removeChild(cubeContainer.firstChild);
					} catch (error) {
						console.error("Error removing canvas from DOM:", error);
					}
				}
			}
		};
	});

	// Expanded maker state
	let expandedMaker = makers[0].id;

	// Add ModelViewer reference
	let modelViewer: ModelViewer;
	
	// Initialize Three.js cube
	function initThreeCube() {
		if (!cubeContainer) {
			console.error("Cube container is null, cannot initialize three.js cube");
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
					
					vec3 colorA = vec3(0.4, 0.4, 0.9);  // Indigo
					vec3 colorB = vec3(0.3, 0.3, 0.8);  // Darker indigo
					vec3 colorC = vec3(0.5, 0.5, 1.0);  // Lighter indigo
					
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
					console.error("Required Three.js objects are missing");
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
					console.error("Error in cube animation:", error);
					if (cubeContainer && cubeContainer.dataset && cubeContainer.dataset.animationId) {
						cancelAnimationFrame(parseInt(cubeContainer.dataset.animationId));
					}
				}
			};
			
			// Start animation
			animate();
		} catch (error) {
			console.error("Error initializing Three.js cube:", error);
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

			if (isSupported) {
				modelFile = file;
				modelLoaded = true;
			} else {
				alert('Please upload a supported 3D model file (STL)');
			}
		}
	}

	function browseFiles() {
		const fileInput = document.getElementById('fileInput') as HTMLInputElement;
		fileInput?.click();
	}

	function goBack() {
		window.history.back();
	}

	function toggleMaker(id: number) {
		expandedMaker = expandedMaker === id ? -1 : id;
	}

	function addToCart() {
		// Placeholder for add to cart functionality
		alert('Item added to cart!');
	}
</script>

<div class="w-full flex justify-center min-h-screen gradient-background">
	<div class="gradient-overlay"></div>
	<div class="ambient-orbs">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>
		<div class="orb orb-3"></div>
	</div>
	<div class="w-full max-w-7xl px-4 relative z-10">
		<div class="text-center mb-8 mt-12 ">
			<div class="inline-flex items-center justify-center mb-3">
				<span class="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
				<span class="text-indigo-400 text-sm uppercase tracking-wider font-medium">Print It Forward</span>
			</div>
			<h1 class="text-3xl font-bold mb-2">Community 3D Printing</h1>
			<p class="text-gray-400 max-w-2xl mx-auto text-sm">
				Upload your 3D model and connect with skilled makers in our community who will bring your design to life.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
			<!-- Left panel: Model upload and parameters -->
			<div class="lg:col-span-7">
				<!-- Model preview area -->
				<div class="bg-black/60 border border-zinc-800/80 rounded-lg mb-4 h-80 flex flex-col backdrop-blur-md relative overflow-hidden shadow-glow">
					<div class="cube-glow-effect"></div>
					{#if modelLoaded}
						<div class="flex-1 flex flex-col items-center justify-center relative">
							<ModelViewer 
								bind:this={modelViewer} 
								file={modelFile}
								modelColor={selectedColor}
								selectedMaterial={selectedMaterial}
								selectedScale={scale}
								selectedInfill={infill}
								selectedQuality={selectedQuality}
								selectedWalls={parseInt(strengthLevels[sliderPosition].walls.split(' ')[0])} />
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
					class="w-full bg-black/40 border-2 border-dashed rounded-lg mb-4 p-4 flex flex-col items-center justify-center text-center backdrop-blur-xs shadow-glow-subtle transition-all duration-300 {dragActive ? 'border-indigo-400 shadow-glow-active' : 'border-zinc-800/60'}"
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					onclick={browseFiles}
					ondrop={handleDrop}>
					<div class="flex items-center gap-3">
						<Icon icon="material-symbols:upload" class="text-2xl text-indigo-400 icon-glow" />
						<div class="text-left">
							<div class="text-white font-medium text-sm">Drag & drop your 3D model file</div>
							<div class="flex items-center mt-1">
								<div
									class="text-indigo-400 text-xs underline hover:text-indigo-300 transition-colors"
									>
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
				<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle">
					<div class="flex items-center mb-4">
						<Icon icon="material-symbols:build-outline" class="text-xl text-indigo-400 mr-2 icon-glow" />
						<div class="text-lg font-medium text-white glow-text-subtle">Print Parameters</div>
					</div>

					<!-- Material Selection -->
					<div class="mb-5">
						<label class="text-white/80 text-sm mb-2 block"> Material </label>
						<div class="grid grid-cols-5 gap-1">
							{#each materials as material}
								<button
									class="py-2 text-center text-sm transition-colors rounded {selectedMaterial ===
									material
										? 'bg-blue-700 text-white shadow-glow-active'
										: 'bg-black-800/70 text-white/80 hover:bg-black-700/80'}"
									onclick={() => (selectedMaterial = material)}>{material}</button>
							{/each}
						</div>
					</div>

					<!-- Quality Selection -->
					<div class="mb-5">
						<label class="text-white/80 text-sm mb-2 block"> Quality </label>
						<div class="grid grid-cols-3 gap-1">
							{#each qualities as quality}
								<button
									class="py-2 text-center text-sm transition-colors rounded {selectedQuality ===
									quality
										? 'bg-blue-700 text-white shadow-glow-active'
										: 'bg-black-800/70 text-white/80 hover:bg-black-700/80'}"
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
								class="w-full accent-indigo-400 bg-black-800 h-2 rounded appearance-none" />
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
								{infill}% infill {strengthLevels[sliderPosition].walls !== 'Full' ? strengthLevels[sliderPosition].walls : ''}
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
								class="w-full accent-indigo-700 bg-black-800 h-2 rounded appearance-none" />
							<!-- Visual progress indicator -->
							<div
								class="absolute top-3 left-0 right-0 flex justify-between text-[10px] text-white/50 pointer-events-none"
								>
								{#each Array(7) as _, i}
									<div class="flex flex-col items-start" style="width: 1%">
											<div class="w-0.5 h-2 bg-white/20 mb-1"></div>
											<span class="text-center">{strengthLevels[i].label}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Color Selection -->
					<div class="mb-1">
						<label class="text-white/80 text-sm mb-2 block">Color</label>
						<div class="flex gap-3 mt-2">
							{#each colors as color}
								<button
									class="w-10 h-10 rounded-full border-2 transition-colors {color=='#090909' ? 'outline-1 outline-dashed outline-white shadow-white shadow-xs' : 'outline-transparent'}"
									class:border-white={selectedColor === color}
									class:border-transparent={selectedColor !== color}
									class:scale-110={selectedColor === color}
									style="background-color: {color};"
									onclick={() => (selectedColor = color)}></button>
							{/each}
						</div>
					</div>
				</div>

			</div>

			<!-- Right panel: Available Makers -->
			<div class="lg:col-span-5">
				<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle mb-4">
					<div class="text-lg font-medium text-white mb-4 flex items-center">
						<Icon icon="material-symbols:person-pin-circle" class="text-indigo-400 mr-2 icon-glow" />
						<span class="glow-text-subtle">Available Makers ({makers.length})</span>
					</div>

					<div class="space-y-3">
						{#each makers as maker}
							<div class="bg-black/50 rounded-lg overflow-hidden border border-zinc-800">
								<!-- Maker header -->
								<div
									class="p-3 flex items-center justify-between cursor-pointer hover:bg-black/70 transition-colors"
									onclick={() => toggleMaker(maker.id)}>
									<div class="flex items-center gap-2">
										<div
											class="w-8 h-8 rounded-full flex items-center justify-center"
											style="background-color: {maker.iconColor}30;">
											<Icon icon={maker.icon} style="color: {maker.iconColor}" class="text-lg" />
										</div>
										<div class="font-medium text-white text-lg">{maker.name}</div>
									</div>
									<div class="flex items-center gap-4">
										<div class="flex items-center gap-1">
											<Icon icon="material-symbols:star" class="text-yellow-400 text-sm" />
											<span class="text-white text-sm">{maker.rating}</span>
										</div>
										<button class="text-xl text-zinc-400">
											<Icon
												icon={expandedMaker === maker.id
													? 'material-symbols:expand-less'
													: 'material-symbols:expand-more'} />
										</button>
									</div>
								</div>

								<!-- Expanded maker details -->
								{#if expandedMaker === maker.id}
									<div class="px-3 pb-3">
										<div class="flex items-center gap-4 text-xs text-white/70 mb-2">
											<div class="flex items-center">
												<Icon icon="material-symbols:print" class="text-indigo-400 mr-1" />
												<span
													>{maker.printers} {maker.printers === 1 ? 'printer' : 'printers'}</span>
											</div>
											<div class="flex items-center">
												<Icon
													icon="material-symbols:check-circle-outline"
													class="text-indigo-400 mr-1" />
												<span>{maker.completedJobs} completed jobs</span>
											</div>
										</div>

										{#if maker.id === 1}
											<!-- Printer model for first maker only -->
											<div class="bg-black-900 rounded p-3 mt-2">
												<div class="flex justify-between mb-1">
													<div>
														<div class="text-white font-medium text-sm">{maker.printerModels[0].name}</div>
														<div class="text-white/50 text-xs">{maker.printerModels[0].resolution}</div>
													</div>
													<div class="text-right">
														<div class="text-white font-bold">${maker.printerModels[0].price}</div>
														<div class="text-white/50 text-xs">Estimated base price</div>
													</div>
												</div>

												<div class="mb-3">
													<div class="flex items-center text-white/80 text-xs mb-1">
														<Icon
															icon="material-symbols:check-circle-outline"
															class="text-indigo-400 mr-1 text-xs" />
														<span>Instant printing</span>
														<span class="mx-2 text-white/30">•</span>
														<span>1-2 days</span>
													</div>

													<div class="flex items-center gap-1 mt-1">
														<div class="text-white/50 text-xs">Materials:</div>
														{#each ['PLA', 'PETG', 'TPU'] as mat}
															<span class="bg-black-800 text-white/80 text-xs px-2 py-0.5 rounded"
																>{mat}</span>
														{/each}
													</div>
												</div>

												<button
													class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 rounded text-sm flex items-center justify-center gap-1"
													onclick={addToCart}>
													<Icon icon="material-symbols:add-shopping-cart" />
													Add to Cart
												</button>
											</div>

											
										{:else}
											<div class="text-center py-2 text-white/60 text-sm">
												Click for more details
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- FAQ Section -->
				<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle">
					<div class="text-lg font-medium text-white mb-4 flex items-center">
						<Icon icon="material-symbols:quiz" class="text-indigo-400 mr-2 icon-glow" />
						<span class="glow-text-subtle">Frequently Asked Questions</span>
					</div>

					<Accordion.Root class="w-full" type="multiple">
						<Accordion.Item value="disclaimer" class="border-b border-zinc-800/50 pb-1">
							<Accordion.Trigger class="font-medium hover:text-accent text-sm text-white w-full text-left">
								Disclaimer
							</Accordion.Trigger>
							<Accordion.Content class="text-white/70 text-sm mt-2">
								<p>Well, all weights are estimated so your final quote can change after review.</p>
								<p class="mt-2">
									If you choose to communicate with a crafter and decide to place an order outside of this platform, please be aware that you assume full responsibility for that order. Any ratings or reviews related to such transactions will also not be considered.
								</p>
							</Accordion.Content>
						</Accordion.Item>

						<Accordion.Item value="supports" class="border-b border-zinc-800/50 pb-1">
							<Accordion.Trigger class="font-medium hover:text-accent text-sm text-white w-full text-left">
								How about customization?
							</Accordion.Trigger>
							<Accordion.Content class="text-white/70 text-sm mt-2">
								<p>
									For custom PIF requests, our Discord server is an excellent resource. Additionally, you can utilize the basic chat feature available on the PIF orders page within your profile. After a thorough discussion, the crafter will be able to revise the final quote, allowing you to proceed with your order.
								</p>
							</Accordion.Content>
						</Accordion.Item>

						<Accordion.Item value="3mf" class="border-0 pb-1">
							<Accordion.Trigger class="font-medium hover:text-accent text-sm text-white w-full text-left">
								Why don't you support 3MF?
							</Accordion.Trigger>
							<Accordion.Content class="text-white/70 text-sm mt-2">
								<p>
									Currently, processing 3MF files in the browser is challenging and not fully supported due to various bugs. As an alternative, you can use a slicer of your choice to convert the 3MF file into a single STL format.
								</p>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion.Root>
				</div>

				<!-- Become a Maker Section -->
				<div class="bg-black/40 rounded-lg p-5 backdrop-blur-xs shadow-glow-subtle mt-4">
					<div class="text-lg font-medium text-white mb-4 flex items-center">
						<Icon icon="material-symbols:engineering" class="text-indigo-400 mr-2 icon-glow" />
						<span class="glow-text-subtle">Join the PIF Portal!</span>
					</div>

					<div class="space-y-4">
						<div class="text-white/80 text-sm leading-relaxed">
							<p class="mb-3">
								Are you passionate about 3D printing? Join our community of skilled makers and turn your expertise into opportunities! Share your skills and connect with designers worldwide.
							</p>
							
							<div class="bg-black/30 rounded-lg p-3 mb-4">
								<div class="font-medium text-white mb-2">Requirements:</div>
								<ul class="list-none space-y-2">
									<li class="flex items-center text-white/70">
										<Icon icon="material-symbols:check-circle-outline" class="text-indigo-400 mr-2" />
										<span>Active Selfcrafted Account</span>
									</li>
									<li class="flex items-center text-white/70">
										<Icon icon="material-symbols:check-circle-outline" class="text-indigo-400 mr-2" />
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
								class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded text-sm flex items-center gap-2 transition-colors"
								disabled={!user.data.user}
								onclick={() => goto('/maker-application')}>
								<Icon icon="material-symbols:handyman" />
								I want to be a PIF Crafter!
							</button>
						</div>
						{/await}
					</div>
				</div>
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
		background: rgba(50, 50, 65, 0.8) !important;
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
		background: #6366f1;
		cursor: pointer;
		box-shadow: 0 0 12px 3px rgba(99, 102, 241, 0.4);
		border: 3px solid white;
		transition: all 0.2s ease;
	}

	input[type='range']::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #6366f1;
		cursor: pointer;
		box-shadow: 0 0 12px 3px rgba(99, 102, 241, 0.4);
		border: 3px solid white;
		transition: all 0.2s ease;
	}

	input[type='range']:hover::-webkit-slider-thumb {
		transform: scale(1.1);
		box-shadow: 0 0 15px 4px rgba(99, 102, 241, 0.5);
	}

	input[type='range']:active::-webkit-slider-thumb {
		transform: scale(0.95);
	}

	/* Slider Track Progress */
	input[type='range']::-webkit-slider-runnable-track {
		height: 8px;
		border-radius: 8px;
		background: linear-gradient(90deg,
			rgba(99, 102, 241, 0.6) 0%,
			rgba(165, 180, 252, 0.4) 100%
		);
	}

	input[type='range']::-moz-range-progress {
		background: linear-gradient(90deg,
			rgba(99, 102, 241, 0.6) 0%,
			rgba(165, 180, 252, 0.4) 100%
		);
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
		background: linear-gradient(to bottom right,
			#0a0a12,
			#0f0f1a,
			#0a0a12
		);
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
			radial-gradient(circle at 15% 20%, rgba(99, 101, 241, 0.2) 0%, transparent 45%),
			radial-gradient(circle at 85% 70%, rgba(78, 70, 229, 0.25) 0%, transparent 45%),
			radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%),
			linear-gradient(45deg, 
				rgba(99, 102, 241, 0.05) 0%,
				rgba(0, 0, 0, 0) 40%,
				rgba(79, 70, 229, 0.05) 100%
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
		background: radial-gradient(circle, rgb(120, 122, 245) 0%, transparent 70%);
		top: 5%;
		left: 10%;
		animation: float-orb 20s infinite alternate ease-in-out;
	}
	
	.orb-2 {
		width: 550px;
		height: 550px;
		background: radial-gradient(circle, rgb(90, 82, 235) 0%, transparent 70%);
		bottom: 5%;
		right: 10%;
		animation: float-orb 25s infinite alternate-reverse ease-in-out;
	}
	
	.orb-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, rgb(129, 141, 248) 0%, transparent 70%);
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
		color: var(--color-indigo-400);
		text-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
	}
	
	/* Shadow effects */
	.shadow-glow {
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.3), 
				  0 0 30px rgba(99, 102, 241, 0.1);
	}
	
	.shadow-glow-subtle {
		box-shadow: 0 0 15px rgba(0, 0, 0, 0.2), 
				  0 0 20px rgba(99, 102, 241, 0.03);
	}
	
	.shadow-glow-active {
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.3), 
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
