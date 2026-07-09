<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { STLLoader } from 'three/addons/loaders/STLLoader.js';
	import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
	import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
								import { createEventDispatcher } from 'svelte';
	import Skeleton from '$lib/components/sc/Skeleton.svelte';

	// Material densities in g/cm³
	// };

	interface ModelInfo {
		dimensions: { x: number; y: number; z: number };
		fileSize: string;
		vertexCount: number;
		triangleCount: number;
		isCalculating: boolean;
	}

	interface Props {
		file?: File | null;
		modelColor?: string; // Default to indigo-400
		selectedMaterial?: string;
		selectedScale?: number;
		selectedInfill?: number;
		selectedWalls?: number;
		selectedQuality?: string;
		quantity?: number; // Add new quantity parameter
		modelInfo?: ModelInfo;
		onFailedLoad?: () => void;
	}

	let {
		file = null,
		modelColor = '#6366f1',
		selectedMaterial = 'PLA',
		selectedScale = 1.0,
		selectedInfill = 20,
		selectedWalls = 4,
		selectedQuality = 'Standard (0.20mm)',
		quantity = 1,
		modelInfo = $bindable({
			dimensions: { x: 0, y: 0, z: 0 },
			fileSize: '0 KB',
			vertexCount: 0,
			triangleCount: 0,
			isCalculating: false
		}),
		onFailedLoad = () => {}
	}: Props = $props();

	let container = $state<HTMLDivElement>();
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let controls: OrbitControls;
	let currentModel: THREE.Object3D | null = $state(null);
	let isInitialized = $state(false);
	let isModelLoading = $state(false);
	let modelLoadError = $state<string | null>(null);
	let resizeObserver: ResizeObserver | null = null;
	let pmremGenerator: THREE.PMREMGenerator | null = null;
	let autoRotateResumeTimer: ReturnType<typeof setTimeout> | null = null;

	const AUTO_ROTATE_PAUSE_MS = 8000;

	// Track the last loaded file to prevent reloading the same file
	let lastLoadedFileId = $state('');

	let _sliderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	const SLIDER_DEBOUNCE = 800;

	export function notifySliderMoving() {
		// Clear any existing timer (using non-reactive variables)
		if (_sliderDebounceTimer) {
			clearTimeout(_sliderDebounceTimer);
		}

		_sliderDebounceTimer = setTimeout(() => {
			_sliderDebounceTimer = null;

			// Queue calculation for when slider stops
			// queueWeightCalculation();
		}, SLIDER_DEBOUNCE);
	}

	// Queue a calculation to happen outside of reactivity

	// }

	// }

	// }

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 KB';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function parsePreviewColor(color: string): THREE.Color {
		const parsed = new THREE.Color();
		let normalized = color.trim();

		if (!normalized) {
			return parsed.set('#525252');
		}

		if (!normalized.startsWith('#') && /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) {
			normalized = `#${normalized}`;
		}

		try {
			parsed.setStyle(normalized);
		} catch {
			parsed.set('#525252');
		}

		return parsed;
	}

	function createModelMaterial(color: string): THREE.MeshStandardMaterial {
		return new THREE.MeshStandardMaterial({
			color: parsePreviewColor(color),
			metalness: 0,
			roughness: 0.82,
			envMapIntensity: 0.35,
			flatShading: false
		});
	}

	function isOutlineMesh(mesh: THREE.Mesh): boolean {
		return mesh.name === 'model-outline';
	}

	function prepareSurfaceMesh(mesh: THREE.Mesh, color: string = modelColor) {
		mesh.material = createModelMaterial(color);
		mesh.castShadow = false;
		mesh.receiveShadow = false;
		mesh.renderOrder = 1;
	}

	function addBlackOutline(mesh: THREE.Mesh) {
		const outline = new THREE.Mesh(
			mesh.geometry,
			new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.BackSide
			})
		);
		outline.name = 'model-outline';
		outline.scale.setScalar(1.008);
		outline.renderOrder = 0;
		mesh.add(outline);
	}

	function wrapWithOutline(surfaceMesh: THREE.Mesh): THREE.Group {
		const group = new THREE.Group();
		addBlackOutline(surfaceMesh);
		group.add(surfaceMesh);
		return group;
	}

	function disposeModelObject(object: THREE.Object3D) {
		object.traverse((node) => {
			if (node instanceof THREE.Mesh) {
				if (node.geometry && !isOutlineMesh(node)) {
					node.geometry.dispose();
				}
				if (node.material) {
					if (Array.isArray(node.material)) {
						node.material.forEach((material) => material.dispose());
					} else {
						node.material.dispose();
					}
				}
			}
		});
	}

	function pauseAutoRotate() {
		if (!controls) return;
		controls.autoRotate = false;
		if (autoRotateResumeTimer) {
			clearTimeout(autoRotateResumeTimer);
			autoRotateResumeTimer = null;
		}
	}

	function scheduleAutoRotateResume() {
		if (!controls) return;
		if (autoRotateResumeTimer) {
			clearTimeout(autoRotateResumeTimer);
		}
		autoRotateResumeTimer = setTimeout(() => {
			if (controls) {
				controls.autoRotate = true;
			}
			autoRotateResumeTimer = null;
		}, AUTO_ROTATE_PAUSE_MS);
	}

	function handleControlsStart() {
		pauseAutoRotate();
		renderer?.domElement.classList.remove('cursor-grab');
		renderer?.domElement.classList.add('cursor-grabbing');
	}

	function handleControlsEnd() {
		scheduleAutoRotateResume();
		renderer?.domElement.classList.remove('cursor-grabbing');
		renderer?.domElement.classList.add('cursor-grab');
	}

	function setupSceneLighting(targetScene: THREE.Scene) {
		const ambient = new THREE.AmbientLight(0xffffff, 0.55);
		targetScene.add(ambient);

		const hemi = new THREE.HemisphereLight(0xffffff, 0x999999, 0.65);
		hemi.position.set(0, 1, 0);
		targetScene.add(hemi);

		for (const [x, y, z, intensity] of [
			[6, 8, 10, 0.45],
			[-8, 5, 6, 0.35],
			[0, -4, 10, 0.3],
			[10, 2, -6, 0.25],
			[-6, 10, -4, 0.25]
		] as const) {
			const light = new THREE.DirectionalLight(0xffffff, intensity);
			light.position.set(x, y, z);
			targetScene.add(light);
		}
	}

	// Calculate weight using current parameters

	// }

	$effect(() => {
		void selectedScale;
		void selectedInfill;
		void selectedMaterial;
		void selectedWalls;
		void selectedQuality;
		void quantity;
	});

	// Initial model loading effect
	$effect.pre(() => {
		const currentFileId = file ? `${file.name}-${file.size}-${file.lastModified}` : '';

		if (file && isInitialized && !modelInfo.isCalculating && currentFileId !== lastLoadedFileId) {
			lastLoadedFileId = currentFileId;

			loadModel(file).then(() => {
				// Update file size only after model is loaded
				modelInfo.fileSize = formatFileSize(file.size);
			});
		}

		if (currentModel && modelColor && !modelInfo.isCalculating) {
			updateModelColor(modelColor);
		}
	});

	// Add event dispatcher
	const dispatch = createEventDispatcher();

	function updateModelColor(color: string) {
		if (!currentModel) return;

		currentModel.traverse((child) => {
			if (child instanceof THREE.Mesh && !isOutlineMesh(child)) {
				if (child.material instanceof THREE.MeshStandardMaterial) {
					child.material.color.copy(parsePreviewColor(color));
					child.material.metalness = 0;
					child.material.roughness = 0.82;
					child.material.envMapIntensity = 0.35;
				} else {
					child.material = createModelMaterial(color);
				}
			}
		});
	}

	let isAnimating = false;
	let animationFrameId: number | null = null;

	function startAnimation() {
		if (isAnimating) return;
		isAnimating = true;
		animate();
	}

	function stopAnimation() {
		isAnimating = false;
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	function animate() {
		if (!isAnimating) return;

		animationFrameId = requestAnimationFrame(animate);

		try {
			// Skip rendering if any required component is missing
			if (!controls || !renderer || !scene || !camera) {
				return;
			}

			controls.update();
			renderer.render(scene, camera);
		} catch (error) {
			console.error('Error in animation loop:', error);
			stopAnimation();
		}
	}

	onMount(() => {
		if (!container) return;

		initScene();

		resizeObserver = new ResizeObserver(() => {
			if (!isInitialized) {
				initScene();
			} else {
				handleResize();
			}
		});
		resizeObserver.observe(container);

		window.addEventListener('resize', handleResize);
	});

	async function loadModel(file: File) {
		isModelLoading = true;
		modelLoadError = null;
		try {
			if (!scene) {
				modelLoadError = 'Viewer is not ready yet. Please try again.';
				onFailedLoad();
				return;
			}

			// Clean up previous model resources
			if (currentModel) {
				scene.remove(currentModel);
				disposeModelObject(currentModel);
				currentModel = null;
			}

			// Reset the model info
			modelInfo.dimensions = { x: 0, y: 0, z: 0 };
			modelInfo.triangleCount = 0;
			modelInfo.vertexCount = 0;
			// modelInfo.estimatedWeight = '0g';
			// modelInfo.totalWeight = '0g';

			const url = URL.createObjectURL(file);
			const extension = file.name.split('.').pop()?.toLowerCase();

			// Add loading indicator
			const loadingManager = new THREE.LoadingManager();
			loadingManager.onStart = () => {};

			loadingManager.onError = () => {};

			try {
				switch (extension) {
					case 'stl':
						await loadSTL(url, loadingManager);
						break;
					case 'obj':
						await loadOBJ(url, loadingManager);
						break;
					case '3mf':
						await load3MF(url, loadingManager);
						break;
					default:
						modelLoadError = 'Unsupported file format';
						onFailedLoad();
				}

				if (!currentModel && !modelLoadError) {
					modelLoadError = 'Could not load this model. Please try a different file.';
					onFailedLoad();
				}
			} finally {
				// Always revoke the URL to prevent memory leaks
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.error('Error loading model:', error);
			modelLoadError =
				error instanceof Error ? error.message : 'Failed to load model. Please try again.';
			onFailedLoad();
		} finally {
			isModelLoading = false;
		}
	}

	function centerModelAndCamera(model: THREE.Object3D) {
		if (!scene || !camera || !controls) {
			console.error('Scene, camera or controls not initialized');
			return new THREE.Group(); // Return empty group to prevent null errors
		}

		if (!model) {
			console.error('Model is null or undefined');
			return new THREE.Group(); // Return empty group to prevent null errors
		}

		// Create a group to hold the model
		const group = new THREE.Group();
		scene.add(group);
		group.add(model);

		try {
			// Calculate bounding box
			const box = new THREE.Box3().setFromObject(model);

			// Check if the bounding box is valid
			if (
				box.isEmpty() ||
				!isFinite(box.min.x) ||
				!isFinite(box.min.y) ||
				!isFinite(box.min.z) ||
				!isFinite(box.max.x) ||
				!isFinite(box.max.y) ||
				!isFinite(box.max.z)
			) {
				console.error('Invalid bounding box for model');

				// Set default camera position
				camera.position.set(0, 0, 5);
				camera.lookAt(0, 0, 0);
				controls.target.set(0, 0, 0);
				controls.update();

				return group;
			}

			const center = box.getCenter(new THREE.Vector3());
			const size = box.getSize(new THREE.Vector3());
			const maxDim = Math.max(size.x, size.y, size.z);

			// Center the model in the group
			model.position.sub(center);

			// Handle abnormally large models
			if (maxDim > 1000) {
				const scale = 100 / maxDim;
				group.scale.set(scale, scale, scale);
			}

			// Set camera position based on model size
			const scaledMaxDim = maxDim > 1000 ? 100 : maxDim;
			const distance = Math.max(scaledMaxDim * 3, 5); // Ensure minimum distance
			camera.position.set(0, 0, distance);
			camera.lookAt(0, 0, 0);

			// Update controls
			controls.target.set(0, 0, 0);
			controls.update();
		} catch (error) {
			console.error('Error processing model:', error);
			// Set default camera position
			camera.position.set(0, 0, 5);
			camera.lookAt(0, 0, 0);
			controls.target.set(0, 0, 0);
			controls.update();
		}

		return group;
	}

	async function loadSTL(url: string, loadingManager: THREE.LoadingManager) {
		try {
			const loader = new STLLoader(loadingManager);
			const geometry = await loader.loadAsync(url);
			const mesh = new THREE.Mesh(geometry, createModelMaterial(modelColor));
			prepareSurfaceMesh(mesh);

			geometry.center();

			const box = new THREE.Box3().setFromObject(mesh);
			const size = box.getSize(new THREE.Vector3());

			modelInfo.dimensions = {
				x: size.x,
				y: size.y,
				z: size.z
			};
			modelInfo.vertexCount = geometry.attributes.position.count;
			modelInfo.triangleCount = geometry.attributes.position.count / 3;

			const maxDim = Math.max(size.x, size.y, size.z);
			const model = wrapWithOutline(mesh);
			let scaleFactor = 1;

			if (maxDim > 1000) {
				scaleFactor = 100 / maxDim;
				modelInfo.dimensions.x *= scaleFactor;
				modelInfo.dimensions.y *= scaleFactor;
				modelInfo.dimensions.z *= scaleFactor;
			}

			model.scale.setScalar(scaleFactor * selectedScale);

			if (scene) scene.add(model);
			currentModel = model;

			if (camera && controls) {
				const scaledMaxDim = maxDim > 1000 ? 100 : maxDim;
				const distance = scaledMaxDim * 3;
				camera.position.set(0, 0, distance);
				camera.lookAt(0, 0, 0);
				controls.target.set(0, 0, 0);
				controls.update();
			}
		} catch {
			modelLoadError = 'Could not load this STL file. Please try a different model.';
			onFailedLoad();
		}
	}

	async function loadOBJ(url: string, loadingManager: THREE.LoadingManager) {
		try {
			const loader = new OBJLoader(loadingManager);
			const object = await loader.loadAsync(url);

			if (!object) {
				console.error('Failed to load OBJ model');
				return;
			}

			// Update model information if possible
			try {
				const box = new THREE.Box3().setFromObject(object);
				if (!box.isEmpty()) {
					const size = box.getSize(new THREE.Vector3());
					modelInfo.dimensions = {
						x: size.x,
						y: size.y,
						z: size.z
					};
				}
			} catch (error) {
				console.error('Error calculating OBJ dimensions:', error);
			}

			object.traverse((child) => {
				if (child instanceof THREE.Mesh && !isOutlineMesh(child)) {
					prepareSurfaceMesh(child);
					addBlackOutline(child);

					// Update triangle count if possible
					if (child.geometry) {
						if (child.geometry.index) {
							modelInfo.triangleCount += child.geometry.index.count / 3;
						} else if (child.geometry.attributes.position) {
							modelInfo.triangleCount += child.geometry.attributes.position.count / 3;
						}
					}
				}
			});

			if (scene && camera && controls) {
				const group = centerModelAndCamera(object);
				currentModel = group;
			}
		} catch (error) {
			console.error('Error loading OBJ:', error);
		}
	}

	async function load3MF(url: string, loadingManager: THREE.LoadingManager) {
		try {
			const loader = new ThreeMFLoader(loadingManager);
			const object = await loader.loadAsync(url);

			if (!object) {
				console.error('Failed to load 3MF model');
				return;
			}

			// Update model information if possible
			try {
				const box = new THREE.Box3().setFromObject(object);
				if (!box.isEmpty()) {
					const size = box.getSize(new THREE.Vector3());
					modelInfo.dimensions = {
						x: size.x,
						y: size.y,
						z: size.z
					};
				}
			} catch (error) {
				console.error('Error calculating 3MF dimensions:', error);
			}

			// Count triangles and set materials
			let triangleCount = 0;
			object.traverse((child) => {
				if (child instanceof THREE.Mesh && !isOutlineMesh(child)) {
					prepareSurfaceMesh(child);
					addBlackOutline(child);

					// Update triangle count if possible
					if (child.geometry) {
						if (child.geometry.index) {
							triangleCount += child.geometry.index.count / 3;
						} else if (child.geometry.attributes.position) {
							triangleCount += child.geometry.attributes.position.count / 3;
						}
					}
				}
			});
			modelInfo.triangleCount = triangleCount;

			if (scene && camera && controls) {
				const group = centerModelAndCamera(object);
				currentModel = group;
			}
		} catch (error) {
			console.error('Error loading 3MF:', error);
		}
	}

	function handleResize() {
		if (!camera || !renderer || !container) return;

		const width = container.clientWidth;
		const height = container.clientHeight;
		if (width <= 0 || height <= 0) return;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
	}

	function getSceneBackgroundColor(el: HTMLElement): THREE.Color {
		const bg = getComputedStyle(el).backgroundColor;
		if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
			return new THREE.Color(bg);
		}

		const hsl = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
		return new THREE.Color(hsl ? `hsl(${hsl})` : '#000000');
	}

	function initScene() {
		if (!container || isInitialized) return;

		const width = container.clientWidth;
		const height = container.clientHeight;
		if (width <= 0 || height <= 0) return;

		scene = new THREE.Scene();
		scene.background = getSceneBackgroundColor(container);

		camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
		camera.position.z = 5;

		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: false
		});
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.shadowMap.enabled = false;
		renderer.domElement.classList.add(
			'absolute',
			'inset-0',
			'size-full',
			'touch-none',
			'cursor-grab'
		);
		container.appendChild(renderer.domElement);

		pmremGenerator = new THREE.PMREMGenerator(renderer);
		scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
		scene.environmentIntensity = 0.55;

		setupSceneLighting(scene);

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.minDistance = 0.1;
		controls.maxDistance = 1000;
		controls.enablePan = true;
		controls.screenSpacePanning = true;
		controls.autoRotate = true;
		controls.autoRotateSpeed = 1.0;
		controls.addEventListener('start', handleControlsStart);
		controls.addEventListener('end', handleControlsEnd);

		isInitialized = true;
		startAnimation();
	}

	// Control functions
	function zoomIn() {
		if (!camera || !controls) return;
		camera.position.multiplyScalar(0.8);
		controls.update();
	}

	function zoomOut() {
		if (!camera || !controls) return;
		camera.position.multiplyScalar(1.25);
		controls.update();
	}

	function rotateLeft() {
		if (!currentModel || !scene) return;
		currentModel.rotation.y += 0.1;
	}

	function rotateRight() {
		if (!currentModel || !scene) return;
		currentModel.rotation.y -= 0.1;
	}

	function rotateUp() {
		if (!currentModel || !scene) return;
		currentModel.rotation.x += 0.1;
	}

	function rotateDown() {
		if (!currentModel || !scene) return;
		currentModel.rotation.x -= 0.1;
	}

	// Export reset function
	export function resetView() {
		if (!currentModel || !camera || !controls) return;

		try {
			const box = new THREE.Box3().setFromObject(currentModel);
			const size = box.getSize(new THREE.Vector3());
			const maxDim = Math.max(size.x, size.y, size.z);

			// Handle abnormally large models
			const scaledMaxDim = maxDim > 1000 ? 100 : maxDim;
			const distance = scaledMaxDim * 3;

			camera.position.set(0, 0, distance);
			camera.lookAt(0, 0, 0);
			controls.target.set(0, 0, 0);
			controls.update();

			// Reset rotation
			currentModel.rotation.set(0, 0, 0);

			dispatch('reset');
		} catch (error) {
			console.error('Error in resetView:', error);
		}
	}

	onDestroy(() => {
		// Stop animation
		stopAnimation();

		resizeObserver?.disconnect();
		window.removeEventListener('resize', handleResize);

		pmremGenerator?.dispose();
		scene?.environment?.dispose?.();

		if (renderer) {
			renderer.dispose();
			if (renderer.domElement && renderer.domElement.parentNode) {
				renderer.domElement.parentNode.removeChild(renderer.domElement);
			}
		}

		if (controls) {
			controls.removeEventListener('start', handleControlsStart);
			controls.removeEventListener('end', handleControlsEnd);
			controls.dispose();
		}

		if (autoRotateResumeTimer) {
			clearTimeout(autoRotateResumeTimer);
			autoRotateResumeTimer = null;
		}

		// Clean up any other resources
		if (currentModel) {
			disposeModelObject(currentModel);
		}

		isInitialized = false;
	});

	const controlButtonClass =
		'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground active:bg-muted/60';

	const viewerControls = [
		{ label: 'Zoom out', icon: F.zoomOut, action: zoomOut },
		{ label: 'Zoom in', icon: F.zoomIn, action: zoomIn },
		{ label: 'Rotate left', icon: F.rotateCcw, action: rotateLeft },
		{ label: 'Rotate right', icon: F.rotateCw, action: rotateRight },
		{ label: 'Rotate up', icon: F.arrowUp, action: rotateUp },
		{ label: 'Rotate down', icon: F.arrowDown, action: rotateDown },
		{ label: 'Reset view', icon: F.refresh, action: resetView }
	] as const;
</script>

<div class="absolute inset-0 overflow-hidden bg-background">
	<div class="absolute inset-0 z-0" bind:this={container}></div>

	<div class="pointer-events-none absolute inset-0 z-10">
		<div
			class="pointer-events-auto absolute bottom-3 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-card/90 p-1 backdrop-blur-sm"
			role="toolbar"
			aria-label="Model viewer controls">
			{#each viewerControls as control, index (control.label)}
				{#if index === 2 || index === 4 || index === 6}
					<span class="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true"></span>
				{/if}
				<button
					type="button"
					onclick={control.action}
					title={control.label}
					aria-label={control.label}
					class={controlButtonClass}>
					<Icon icon={control.icon} class="size-3.5" />
				</button>
			{/each}
		</div>
	</div>

	{#if isModelLoading}
		<div
			class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
			aria-hidden="true">
			<Skeleton class="h-full w-full rounded-none border-0 opacity-60" animate={true} />
		</div>
	{:else if modelLoadError}
		<div
			class="absolute inset-0 z-20 flex items-center justify-center bg-background/90 px-4 text-center backdrop-blur-sm"
			role="alert">
			<p class="text-sm text-destructive">{modelLoadError}</p>
		</div>
	{/if}
</div>
