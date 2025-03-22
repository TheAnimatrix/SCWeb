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
  for (let i = 0; i < position.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(position, i);
    const b = new Vector3().fromBufferAttribute(position, i + 1);
    const c = new Vector3().fromBufferAttribute(position, i + 2);
    volume += (a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x)) / 6;
    const ab = new Vector3().subVectors(b, a);
    const ac = new Vector3().subVectors(c, a);
    const cross = new Vector3().crossVectors(ab, ac);
    area += cross.length() / 2;
  }
  volume = Math.abs(volume);
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

// Extract geometries from loaded object
function getGeometries(loadedObject: BufferGeometry | Group): BufferGeometry[] {
  if (loadedObject instanceof BufferGeometry) {
    return [loadedObject];
  } else if (loadedObject instanceof Group) {
    const geometries: BufferGeometry[] = [];
    loadedObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        geometries.push(child.geometry as BufferGeometry);
      }
    });
    return geometries;
  } else {
    throw new Error('Unexpected loaded object type.');
  }
}

// Main function to estimate weight with scale option
async function estimateWeight(
  material: Material,
  infill: number, // percentage (0-100)
  walls: number, // number of wall lines
  layerHeight: number, // in mm, not used in weight calculation
  scale: number = 1.0, // scale factor (e.g., 1.1 for 110%)
  modelFile: string | File // URL or File object
): Promise<number> {
    scale = 0.91 * scale;
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

  // Get geometries from the loaded object
  const geometries = getGeometries(loadedObject);

  // Calculate base volume and surface area (in mm³ and mm²)
  const { volume, area } = calculateVolumeAndArea(geometries);

  // Apply scaling: volume scales with cube of scale factor, area with square
  const scaledVolume = volume * Math.pow(scale, 3);
  const scaledArea = area * Math.pow(scale, 2);

  // Calculate material volume
  const volumeWalls = scaledArea * wallThickness; // mm³
  let volumeInternal = scaledVolume - volumeWalls; // mm³
  if (volumeInternal < 0) volumeInternal = 0; // Prevent negative internal volume
  const volumeMaterial = volumeWalls + volumeInternal * (infill / 100); // mm³

  // Calculate weight in grams (volume in mm³ to cm³ is /1000)
  const weight = (volumeMaterial / 1000) * density;
  return weight;
}

export { estimateWeight };