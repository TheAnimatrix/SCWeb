<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { STLLoader } from 'three/addons/loaders/STLLoader.js';
    import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
    import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
    import Icon from '@iconify/svelte';
    import { createEventDispatcher } from 'svelte';
    import { estimateWeight } from '$lib/helper/modelWeightCalculator';

    // Material densities in g/cm³
    // const MATERIAL_DENSITIES = {
    //     'PLA': 1.24,
    //     'ABS': 1.04,
    //     'PETG': 1.27,
    //     'TPU': 1.20,
    //     'NYLON': 1.14
    // };

    interface Props {
        file?: File | null;
        modelColor?: string; // Default to indigo-400
        selectedMaterial?: string;
        selectedScale?: number;
        selectedInfill?: number;
        selectedWalls?: number;
        selectedQuality?: string;
        quantity?: number; // Add new quantity parameter
    }

    let {
        file = null,
        modelColor = '#6366f1',
        selectedMaterial = 'PLA',
        selectedScale = 1.0,
        selectedInfill = 20,
        selectedWalls = 4,
        selectedQuality = 'Standard (0.20mm)',
        quantity = 1
    }: Props = $props();
    
    let container: HTMLDivElement = $state();
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let currentModel: THREE.Object3D | null = $state(null);
    let isInitialized = $state(false);

    // Add state for model information and loading state
    let modelInfo = $state({
        dimensions: { x: 0, y: 0, z: 0 },
        fileSize: '0 KB',
        vertexCount: 0,
        triangleCount: 0,
        // estimatedWeight: '0g',
        // totalWeight: '0g',
        isCalculating: false,
        // calculationAttempts: 0  // Track calculation attempts
    });
    
    // Track the last loaded file to prevent reloading the same file
    let lastLoadedFileId = $state('');
    
    // NON-REACTIVE state for calculations - completely outside Svelte's reactivity system
    // Using plain JS variables to avoid reactivity loops
    const weightCalculationCache = new Map<string, number>();
    let _currentParameterHash = '';
    let _isCalculating = false;
    let _isSliderMoving = false;
    let _sliderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let _calculateQueued = false;
    const SLIDER_DEBOUNCE = 800; 
    
    // Helper function to generate a parameter hash
    function generateParameterHash(): string {
        if (!modelInfo || !modelInfo.dimensions) return '';
        
        // Get current dimensions adjusted by scale
        const scaledDimensions = {
            x: modelInfo.dimensions.x * selectedScale,
            y: modelInfo.dimensions.y * selectedScale, 
            z: modelInfo.dimensions.z * selectedScale
        };
        
        return `${selectedScale.toFixed(2)}_${selectedInfill}_${selectedMaterial}_${selectedWalls}_${selectedQuality}_${quantity}_${scaledDimensions.x.toFixed(2)}_${scaledDimensions.y.toFixed(2)}_${scaledDimensions.z.toFixed(2)}`;
    }

    // Helper function to generate cache key from parameters
    function getCacheKey(): string {
        if (!modelInfo || !modelInfo.dimensions) return '';
        
        // Get current dimensions adjusted by scale
        const scaledDimensions = {
            x: modelInfo.dimensions.x * selectedScale,
            y: modelInfo.dimensions.y * selectedScale, 
            z: modelInfo.dimensions.z * selectedScale
        };
        
        return `${scaledDimensions.x.toFixed(2)}_${scaledDimensions.y.toFixed(2)}_${scaledDimensions.z.toFixed(2)}_${selectedInfill}_${selectedMaterial}_${selectedWalls}_${selectedQuality}`;
    }

    // Export function to notify when slider values change - called from parent
    export function notifySliderMoving() {
        // Clear any existing timer (using non-reactive variables)
        if (_sliderDebounceTimer) {
            clearTimeout(_sliderDebounceTimer);
        }
        
        // Mark as moving (non-reactive)
        _isSliderMoving = true;
        
        // Set up debounce to mark as stopped after delay
        _sliderDebounceTimer = setTimeout(() => {
            _isSliderMoving = false;
            _sliderDebounceTimer = null;
            
            // Queue calculation for when slider stops
            // queueWeightCalculation();
        }, SLIDER_DEBOUNCE);
    }

    // Queue a calculation to happen outside of reactivity
    // function queueWeightCalculation() {
    //     if (_isCalculating || _isSliderMoving) {
    //         _calculateQueued = true;
    //         return;
    //     }
        
    //     // Compare parameter hash to see if calculation is needed
    //     const newHash = generateParameterHash();
    //     if (newHash !== _currentParameterHash) {
    //         _currentParameterHash = newHash;
            
    //         // Schedule weight calculation outside of reactive cycle
    //         setTimeout(calculateWeight, 50);
    //     }
    // }

    // // Quick estimate function for fallback
    // function calculateQuickEstimate(): number {
    //     const scaledDimensions = {
    //         x: modelInfo.dimensions.x * selectedScale,
    //         y: modelInfo.dimensions.y * selectedScale, 
    //         z: modelInfo.dimensions.z * selectedScale
    //     };
        
    //     const volume = scaledDimensions.x * scaledDimensions.y * scaledDimensions.z;
    //     const materialDensity = MATERIAL_DENSITIES[selectedMaterial] || 1.24;
    //     return (volume / 1000) * materialDensity * (selectedInfill / 100);
    // }

    // // Helper function to format weight
    // function formatWeight(weight: number): string {
    //     if (weight < 1) {
    //         return `${(weight * 1000).toFixed(1)}mg`;
    //     }
    //     return `${weight.toFixed(1)}g`;
    // }

    // Helper function to format file size
    function formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 KB';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to format dimensions
    function formatDimension(value: number): string {
        return value.toFixed(2) + ' mm';
    }

    // Calculate weight using current parameters
    // async function calculateWeight() {
    //     if (!file || !currentModel || !modelInfo || modelInfo.dimensions.x <= 0 || _isCalculating) {
    //         return;
    //     }
        
    //     // Set flags first (non-reactive)
    //     _isCalculating = true;
    //     _calculateQueued = false;
        
    //     // Update UI state (reactive, but isolated)
    //     setTimeout(() => {
    //         modelInfo.isCalculating = true;
    //     }, 0);
        
    //     const cacheKey = getCacheKey();
    //     let weight: number;
        
    //     try {
    //         // Check cache first
    //         if (weightCalculationCache.has(cacheKey)) {
    //             weight = weightCalculationCache.get(cacheKey)!;
    //         } else {
    //             // Extract layer height from quality string
    //             const layerHeightMatch = selectedQuality.match(/\(([\d.]+)mm\)/);
    //             const layerHeight = layerHeightMatch ? parseFloat(layerHeightMatch[1]) : 0.2;
                
    //             // Calculate weight with timeout protection
    //             const timeoutPromise = new Promise<number>((_, reject) => {
    //                 setTimeout(() => reject(new Error("Weight calculation timed out")), 5000);
    //             });
                
    //             // Do the actual calculation
    //             const calculationPromise = estimateWeight(
    //                 selectedMaterial,
    //                 selectedInfill,
    //                 selectedWalls,
    //                 layerHeight,
    //                 selectedScale,
    //                 file
    //             );
                
    //             // Race between calculation and timeout
    //             weight = await Promise.race([calculationPromise, timeoutPromise])
    //                 .catch(error => {
    //                     console.error("Error calculating weight:", error);
    //                     // Fall back to quick estimate
    //                     return calculateQuickEstimate();
    //                 });
                
    //             // Cache result
    //             weightCalculationCache.set(cacheKey, weight);
    //         }
            
    //         // Update UI weight with minimum of 3g
    //         const finalWeight = Math.max(weight, 3);
            
    //         // Update UI safely outside of reactive cycle
    //         setTimeout(() => {
    //             if (modelInfo) {
    //                 modelInfo.estimatedWeight = formatWeight(finalWeight);
    //                 modelInfo.totalWeight = formatWeight(finalWeight * quantity);
                    
    //                 // Reset calculation state after a delay to ensure UI updates first
    //                 setTimeout(() => {
    //                     modelInfo.isCalculating = false;
    //                 }, 100);
    //             }
    //         }, 100);
    //     } 
    //     catch (error) {
    //         console.error("Weight calculation failed:", error);
            
    //         // Use quick estimate as fallback
    //         const quickEstimate = calculateQuickEstimate();
    //         const finalWeight = Math.max(quickEstimate, 3);
            
    //         setTimeout(() => {
    //             if (modelInfo) {
    //                 modelInfo.estimatedWeight = formatWeight(finalWeight);
    //                 modelInfo.totalWeight = formatWeight(finalWeight * quantity);
                    
    //                 // Reset calculation state after a delay to ensure UI updates first
    //                 setTimeout(() => {
    //                     modelInfo.isCalculating = false;
    //                 }, 100);
    //             }
    //         }, 100);
    //     }
    //     finally {
    //         // Release calculation lock
    //         _isCalculating = false;
            
    //         // Process any queued calculations
    //         if (_calculateQueued && !_isSliderMoving) {
    //             setTimeout(queueWeightCalculation, 500);
    //         }
    //     }
    // }

    // Track parameters without causing reactivity
    function trackParameters() {
        // Capture current values without causing reactivity
        const scale = selectedScale;
        const infill = selectedInfill;
        const material = selectedMaterial;
        const walls = selectedWalls;
        const quality = selectedQuality;
        const qty = quantity;
        
        // // Only queue calculation if not already calculating or moving slider
        // if (!_isCalculating && !_isSliderMoving && currentModel && file) {
        //     queueWeightCalculation();
        // }
    }

    // Add custom handler functions for specific parameter updates
    function onScaleChange() {
        notifySliderMoving();
    }
    
    function onInfillChange() {
        notifySliderMoving();
    }
    
    function onOtherParameterChange() {
        // if (!_isSliderMoving && !_isCalculating) {
        //     queueWeightCalculation();
        // }
    }

    // Use a single effect for parameter tracking but don't cause updates inside it
    $effect(() => {
        // Track all parameter changes but don't cause updates
        const scale = selectedScale;
        const infill = selectedInfill;
        const material = selectedMaterial;
        const walls = selectedWalls;
        const quality = selectedQuality;
        const qty = quantity;
        
        // Call external function to track without changing state inside effect
        trackParameters();
    });

    // Initial model loading effect
    $effect.pre(()=>{
        // Only load the model if it's a new file or if we haven't loaded a file yet
        const currentFileId = file ? `${file.name}-${file.size}-${file.lastModified}` : '';
        
        if (file && isInitialized && !modelInfo.isCalculating && currentFileId !== lastLoadedFileId) {
            lastLoadedFileId = currentFileId;
            
            loadModel(file).then(() => {
                // Update file size only after model is loaded
                modelInfo.fileSize = formatFileSize(file.size);
                
                // Initial hash and calculation queue
                _currentParameterHash = generateParameterHash();
                
                // Use timeout to break the reactivity chain
                // setTimeout(calculateWeight, 100);
            });
        }

        if (currentModel && modelColor && !modelInfo.isCalculating) {
            updateModelColor(modelColor);
        }
    })

    // Add event dispatcher
    const dispatch = createEventDispatcher();

    function updateModelColor(color: string) {
        if (!currentModel) return;
        
        currentModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.material) {
                    if (child.material instanceof THREE.MeshPhongMaterial) {
                        child.material.color.setStyle(color);
                        child.material.specular = new THREE.Color(0xffffff);
                        child.material.shininess = 30;
                    } else {
                        // If not a MeshPhongMaterial, replace it with one
                        child.material = new THREE.MeshPhongMaterial({
                            color: color,
                            specular: 0xffffff,
                            shininess: 30,
                            flatShading: false
                        });
                    }
                }
            }
        });
    }

    // Update animation function to be more resilient
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
            console.error("Error in animation loop:", error);
            stopAnimation();
        }
    }

    onMount(async () => {
        if (!container) return;
        
        // Setup Three.js scene with a darker background that matches the page
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080810); // Much darker background to match page
        
        camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 2000);
        camera.position.z = 5;

        // Setup renderer with better antialiasing
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Enhanced lighting setup for darker background
        const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Reduced ambient light
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased main light
        directionalLight.position.set(10, 10, 15);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0); // Increased main light
        directionalLight2.position.set(-10, -10, -15);
        directionalLight2.castShadow = true;
        scene.add(directionalLight2);

        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1.0); // Increased main light
        directionalLight3.position.set(0, 10, 0);
        directionalLight3.castShadow = true;
        scene.add(directionalLight3);

        const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1.0); // Increased main light
        directionalLight4.position.set(0, -10, 0);
        directionalLight4.castShadow = true;
        scene.add(directionalLight4);

        // Add rim light for better edge definition
        // const rimLight = new THREE.DirectionalLight(0x6366f1, 0.4); // Indigo rim light
        // rimLight.position.set(-5, 5, -5);
        // scene.add(rimLight);
        

        // Add subtle point lights for better detail
        const pointLight1 = new THREE.PointLight(0x6366f1, 0.3); // Indigo point light
        pointLight1.position.set(2, 2, 2);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x4f46e5, 0.3); // Darker indigo point light
        pointLight2.position.set(-2, -2, 2);
        scene.add(pointLight2);

        // Add controls with improved zoom range and damping
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 0.1;
        controls.maxDistance = 1000;
        controls.enablePan = true;
        controls.screenSpacePanning = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;

        // Handle window resize
        window.addEventListener('resize', handleResize);

        isInitialized = true;
        
        // Start animation only when everything is ready
        startAnimation();
    });

    async function loadModel(file: File) {
        try {
            if (!scene) {
                console.error("Scene not initialized");
                return;
            }
            
            // Clean up previous model resources
            if (currentModel) {
                scene.remove(currentModel);
                currentModel.traverse((node) => {
                    if (node instanceof THREE.Mesh) {
                        if (node.geometry) node.geometry.dispose();
                        if (node.material) {
                            if (Array.isArray(node.material)) {
                                node.material.forEach(material => material.dispose());
                            } else {
                                node.material.dispose();
                            }
                        }
                    }
                });
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
            loadingManager.onStart = () => {
            };
            
            loadingManager.onError = (url) => {
            };

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
                        console.error('Unsupported file format');
                }
            } finally {
                // Always revoke the URL to prevent memory leaks
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }

    // Helper function to center and position camera for any model
    function centerModelAndCamera(model: THREE.Object3D) {
        if (!scene || !camera || !controls) {
            console.error("Scene, camera or controls not initialized");
            return new THREE.Group(); // Return empty group to prevent null errors
        }
        
        if (!model) {
            console.error("Model is null or undefined");
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
            if (box.isEmpty() || 
                !isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z) ||
                !isFinite(box.max.x) || !isFinite(box.max.y) || !isFinite(box.max.z)) {
                console.error("Invalid bounding box for model");
                
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
            console.error("Error processing model:", error);
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
            const material = new THREE.MeshPhongMaterial({ 
                color: modelColor,
                specular: 0xffffff,
                shininess: 30,
                flatShading: false
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            geometry.center();
            
            const box = new THREE.Box3().setFromObject(mesh);
            const size = box.getSize(new THREE.Vector3());
            
            // Update model information with base dimensions (before scaling)
            modelInfo.dimensions = {
                x: size.x,
                y: size.y,
                z: size.z
            };
            modelInfo.vertexCount = geometry.attributes.position.count;
            modelInfo.triangleCount = geometry.attributes.position.count / 3;
            
            const maxDim = Math.max(size.x, size.y, size.z);
            
            if (maxDim > 1000) {
                const scale = 100 / maxDim;
                mesh.scale.set(scale, scale, scale);
                // Adjust stored dimensions for the automatic scaling
                modelInfo.dimensions.x *= scale;
                modelInfo.dimensions.y *= scale;
                modelInfo.dimensions.z *= scale;
            }
            
            // Apply user-selected scale
            mesh.scale.multiplyScalar(selectedScale);
            
            if (scene) scene.add(mesh);
            currentModel = mesh;
            
            if (camera && controls) {
                const scaledMaxDim = maxDim > 1000 ? 100 : maxDim;
                const distance = scaledMaxDim * 3;
                camera.position.set(0, 0, distance);
                camera.lookAt(0, 0, 0);
                controls.target.set(0, 0, 0);
                controls.update();
            }
        } catch (error) {
            console.error("Error loading STL:", error);
        }
    }

    async function loadOBJ(url: string, loadingManager: THREE.LoadingManager) {
        try {
            const loader = new OBJLoader(loadingManager);
            const object = await loader.loadAsync(url);
            
            if (!object) {
                console.error("Failed to load OBJ model");
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
                console.error("Error calculating OBJ dimensions:", error);
            }
            
            object.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: modelColor,
                        specular: 0xffffff,
                        shininess: 30,
                        flatShading: false
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
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
            
            // Use the helper function to center model and position camera
            if (scene && camera && controls) {
                const group = centerModelAndCamera(object);
                currentModel = group;
            }
        } catch (error) {
            console.error("Error loading OBJ:", error);
        }
    }

    async function load3MF(url: string, loadingManager: THREE.LoadingManager) {
        try {
            const loader = new ThreeMFLoader(loadingManager);
            const object = await loader.loadAsync(url);
            
            if (!object) {
                console.error("Failed to load 3MF model");
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
                console.error("Error calculating 3MF dimensions:", error);
            }
            
            // Count triangles and set materials
            let triangleCount = 0;
            object.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: modelColor,
                        specular: 0xffffff,
                        shininess: 30,
                        flatShading: false
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
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
            
            // Use the helper function to center model and position camera
            if (scene && camera && controls) {
                const group = centerModelAndCamera(object);
                currentModel = group;
            }
        } catch (error) {
            console.error("Error loading 3MF:", error);
        }
    }

    function handleResize() {
        if (!camera || !renderer || !container) return;
        
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
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
            console.error("Error in resetView:", error);
        }
    }

    onDestroy(() => {
        // Stop animation
        stopAnimation();
        
        window.removeEventListener('resize', handleResize);
        
        if (renderer) {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        }
        
        if (controls) {
            controls.dispose();
        }
        
        // Clean up any other resources
        if (currentModel) {
            currentModel.traverse((node) => {
                if (node instanceof THREE.Mesh) {
                    if (node.geometry) node.geometry.dispose();
                    if (node.material) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(material => material.dispose());
                        } else {
                            node.material.dispose();
                        }
                    }
                }
            });
        }
        
        // Remove references to prevent memory leaks, don't set to null to avoid type errors
        isInitialized = false;
    });
</script>

<div class="w-full h-full relative" bind:this={container}>
    <!-- Control buttons in horizontal bar -->
    <div class="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex flex-row backdrop-blur-xs gap-2 bg-black/50 rounded-full p-1.5">
        <button 
            onclick={zoomOut} 
            title="Zoom Out"
            class=" border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:zoom-out" />
        </button>
        
        <button 
            onclick={zoomIn} 
            title="Zoom In"
            class="border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:zoom-in" />
        </button>
        
        <button 
            onclick={rotateLeft} 
            title="Rotate Left"
            class="border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:rotate-left" />
        </button>
        
        <button 
            onclick={rotateRight} 
            title="Rotate Right"
            class="border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:rotate-right" />
        </button>
        
        <button 
            onclick={rotateUp} 
            title="Rotate Up"
            class="border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:arrow-upward" />
        </button>
        
        <button 
            onclick={rotateDown} 
            title="Rotate Down"
            class="border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:arrow-downward" />
        </button>
        
        <button 
            onclick={resetView} 
            title="Reset View"
            class="border-none text-white p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center w-9 h-9 hover:bg-white/20 hover:scale-105 active:scale-95"
        >
            <Icon icon="material-symbols:restart-alt" />
        </button>
    </div>
    
    <!-- Model Information Panel -->
    {#if file}
        <div class="model-info-panel absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-md rounded-lg p-3 text-xs text-white/90">
            <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <span class="text-indigo-300/80">Size:</span>
                <span class="font-medium">{modelInfo.fileSize}</span>
                
                <span class="text-indigo-300/80">Dimensions:</span>
                <span class="font-medium">
                    {formatDimension(modelInfo.dimensions.x * selectedScale)} × 
                    {formatDimension(modelInfo.dimensions.y * selectedScale)} × 
                    {formatDimension(modelInfo.dimensions.z * selectedScale)}
                </span>
                
                <!-- <span class="text-indigo-300/80">Est. Weight:</span>
                <div class="font-medium">
                    {#if modelInfo.isCalculating}
                        <div class="flex items-center">
                            <span class="text-indigo-200 animate-pulse">Calculating...</span>
                            <button 
                                onclick={() => { 
                                    modelInfo.isCalculating = false;
                                    // Provide fallback value if needed
                                    if (modelInfo.estimatedWeight === '0g') {
                                        const quickEstimate = calculateQuickEstimate();
                                        modelInfo.estimatedWeight = formatWeight(Math.max(quickEstimate, 3));
                                        modelInfo.totalWeight = formatWeight(Math.max(quickEstimate, 3) * quantity);
                                    }
                                }}
                                class="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-white/10"
                                title="Reset calculation"
                            >
                                <Icon icon="material-symbols:refresh" class="w-3 h-3" />
                            </button>
                        </div>
                    {:else}
                        <span>{modelInfo.estimatedWeight}</span>
                        {#if quantity > 1}
                            <div class="text-indigo-300/80 flex items-center gap-1 mt-1">
                                <span class="text-[10px]">Total:</span>
                                <span class="text-white text-[11px] font-medium">{modelInfo.totalWeight}</span>
                                <span class="text-indigo-200/80 text-[10px] ml-1">({quantity}x)</span>
                            </div>
                        {/if}
                        <span class="text-indigo-300/60 text-[10px] block">
                            ({selectedMaterial}, {selectedInfill}% infill, {selectedWalls} walls)
                        </span>
                    {/if}
                </div> -->
            </div>
        </div>
    {/if}
    
    {#if !file}
        <div class="absolute inset-0 flex items-center justify-center bg-black/70">
            <div class="text-white text-lg">Loading model...</div>
        </div>
    {/if}
</div>

<style>
    /* Only keep canvas styling as it's required for Three.js */
    canvas {
        width: 100%;
        height: 100%;
    }
</style>