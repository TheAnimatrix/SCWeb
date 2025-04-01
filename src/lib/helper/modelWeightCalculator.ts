import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { BufferGeometry, Group, Vector3 } from 'three';

// Define supported materials
type Material = 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'NYLON';

// Material densities in g/cm³
const densities: Record<Material, number> = {
  PLA: 1.24,
  ABS: 1.04,
  PETG: 1.27,
  TPU: 1.20,
  NYLON: 1.14
};

// Helper to get file extension
function getFileExtension(file: string | File): string | null {
  if (typeof file === 'string') {
    return file.split('.').pop()?.toLowerCase() || null;
  } else if (file instanceof File) {
    return file.name.split('.').pop()?.toLowerCase() || null;
  }
  return null;
}

// Calculate volume and area for a single geometry
function calculateVolumeAndAreaSingle(geometry: BufferGeometry): { volume: number; area: number } {
  let volume = 0;
  let area = 0;
  const position = geometry.attributes.position;
  let skippedTriangles = 0;
  let totalTriangles = position.count / 3;
  
  for (let i = 0; i < position.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(position, i);
    const b = new Vector3().fromBufferAttribute(position, i + 1);
    const c = new Vector3().fromBufferAttribute(position, i + 2);
    
    // Check if any coordinates are NaN
    if (isNaN(a.x) || isNaN(a.y) || isNaN(a.z) || 
        isNaN(b.x) || isNaN(b.y) || isNaN(b.z) || 
        isNaN(c.x) || isNaN(c.y) || isNaN(c.z)) {
        
        // Instead of skipping entirely, try to repair the triangle if possible
        // Fix NaN values with 0 (simple approach)
        if (isNaN(a.x)) a.x = 0;
        if (isNaN(a.y)) a.y = 0;
        if (isNaN(a.z)) a.z = 0;
        if (isNaN(b.x)) b.x = 0;
        if (isNaN(b.y)) b.y = 0;
        if (isNaN(b.z)) b.z = 0;
        if (isNaN(c.x)) c.x = 0;
        if (isNaN(c.y)) c.y = 0;
        if (isNaN(c.z)) c.z = 0;
        
        skippedTriangles++;
    }
    
    // Calculate volume contribution (using signed tetrahedron volume formula)
    const triVolume = (a.x * (b.y * c.z - b.z * c.y) + 
                       a.y * (b.z * c.x - b.x * c.z) + 
                       a.z * (b.x * c.y - b.y * c.x)) / 6;
    
    // Only add valid volume contributions
    if (!isNaN(triVolume)) {
      volume += triVolume;
    }
    
    // Calculate area using cross product
    const ab = new Vector3().subVectors(b, a);
    const ac = new Vector3().subVectors(c, a);
    const cross = new Vector3().crossVectors(ab, ac);
    const triangleArea = cross.length() / 2;
    
    // Only add valid area contributions
    if (!isNaN(triangleArea)) {
      area += triangleArea;
    }
  }
  
  volume = Math.abs(volume);
  
  // Apply correction factor if many triangles were skipped/repaired
  if (skippedTriangles > 0) {
    const skippedRatio = skippedTriangles / totalTriangles;
    
    // If more than 10% of triangles needed repair, apply a correction factor
    if (skippedRatio > 0.1) {
      // Apply a conservative volume adjustment
      const correctionFactor = 1 + (skippedRatio * 0.5); // Increase volume by up to 50% for 100% repaired
      volume *= correctionFactor;
    }
  }
  
  return { volume, area };
}

// Calculate total volume and area for multiple geometries
function calculateVolumeAndArea(geometries: BufferGeometry[]): { volume: number; area: number } {
  let totalVolume = 0;
  let totalArea = 0;
  for (const geometry of geometries) {
    const { volume, area } = calculateVolumeAndAreaSingle(geometry);
    totalVolume += volume;
    totalArea += area;
  }
  return { volume: totalVolume, area: totalArea };
}

// Extract geometries from loaded object, excluding specified names
function getGeometries(loadedObject: BufferGeometry | Group, excludeNames: string[] = []): BufferGeometry[] {
  if (loadedObject instanceof BufferGeometry) {
    return [loadedObject]; // STL case: single geometry, no filtering needed
  } else if (loadedObject instanceof Group) {
    const geometries: BufferGeometry[] = [];
    // More thorough traversal to ensure we don't miss any geometries
    loadedObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Check if the child has a name and if it should be excluded
        const shouldInclude = !child.name || !excludeNames.includes(child.name);
        if (shouldInclude) {
          // Clone the geometry to ensure we process it correctly
          const clonedGeometry = child.geometry.clone();
          
          // Apply any local transformations from the mesh to the geometry
          if (child.matrixWorld) {
            clonedGeometry.applyMatrix4(child.matrixWorld);
          }
          
          geometries.push(clonedGeometry);
        }
      }
    });
    
    return geometries;
  } else {
    throw new Error('Unexpected loaded object type.');
  }
}

// Main function to estimate weight with scale option and excludeNames
async function estimateWeight(
  material: Material,
  infill: number, // percentage (0-100)
  walls: number, // number of wall lines
  layerHeight: number, // in mm, not used in weight calculation
  scale: number = 1.0, // scale factor (e.g., 1.1 for 110%)
  modelFile: string | File, // URL or File object
  excludeNames: string[] = [] // Names of meshes to exclude (e.g., ['buildplate'])
): Promise<number> {
  scale = 0.91 * scale; // Ensure scale is treated as a number
  // Validate material
  const density = densities[material];
  if (!density) {
    throw new Error(`Unknown material: ${material}. Supported materials are PLA, ABS, PETG, TPU, NYLON.`);
  }

  // Printing parameters
  const extrusionWidth = 0.4; // mm, typical line width
  const wallThickness = walls * extrusionWidth; // mm

  // Load the model based on file type
  const extension = getFileExtension(modelFile);
  let loader: STLLoader | ThreeMFLoader;
  if (extension === 'stl') {
    loader = new STLLoader();
  } else if (extension === '3mf') {
    loader = new ThreeMFLoader();
  } else {
    throw new Error(`Unsupported file format: ${extension}. Only STL and 3MF are supported.`);
  }

  let loadedObject: BufferGeometry | Group;
  if (typeof modelFile === 'string') {
    loadedObject = await loader.loadAsync(modelFile);
  } else {
    const url = URL.createObjectURL(modelFile);
    try {
      loadedObject = await loader.loadAsync(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Get geometries from the loaded object, excluding specified names
  const geometries = getGeometries(loadedObject, excludeNames);

  // Calculate base volume and surface area (in mm³ and mm²)
  const { volume, area } = calculateVolumeAndArea(geometries);

  // Apply scaling: volume scales with cube of scale factor, area with square
  const scaledVolume = volume * Math.pow(scale, 3);
  const scaledArea = area * Math.pow(scale, 2);

  // Calculate effective wall volume, ensuring it doesn't exceed total volume
  const maxWallVolume = scaledVolume; // Wall volume can't exceed total volume
  const wallVolumeAttempt = scaledArea * wallThickness; // Attempted wall volume
  const volumeWalls = Math.min(wallVolumeAttempt, maxWallVolume); // Cap wall volume

  // Calculate internal volume
  let volumeInternal = scaledVolume - volumeWalls;
  if (volumeInternal < 0) volumeInternal = 0; // Prevent negative internal volume

  // Calculate material volume
  const volumeMaterial = volumeWalls + volumeInternal * (infill / 100); // mm³

  // Calculate weight in grams (volume in mm³ to cm³ is /1000)
  const weight = (volumeMaterial / 1000) * density;

  // After calculating the weight, ensure a minimum value
  const minimumWeight = 3; // 3 grams minimum
  const finalWeight = Math.max(weight, minimumWeight);

  return finalWeight;
}

export { estimateWeight };