/**
 * GLB loading, geometry flattening and caching for the ring viewer.
 *
 * The pave GLBs are pathological: `Shank_*_Band_diamond.glb` is 10,633 separate
 * mesh primitives describing only 14,798 triangles, and the halo file is 3,472
 * primitives for 4,832 triangles. Drawn as authored that is ~14,100 draw calls
 * to put ~20k triangles on screen, which is what makes the viewer crawl. Every
 * primitive in a file shares one material, so we bake each file down to a
 * single merged BufferGeometry — 14,100 draw calls become 5 for a whole ring.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RingModelAssets } from "@/types/ring";
import type { PartRole } from "./ringMaterials";

export interface RingPartSource {
  url: string;
  role: PartRole;
}

export interface RingPartGeometry {
  geometry: THREE.BufferGeometry;
  /**
   * The part's node transform, deliberately kept *off* the geometry.
   *
   * The metal GLBs are EXT_meshopt_compression + KHR_mesh_quantization: their
   * positions are an interleaved Uint16Array paired with a node scale of about
   * 1.4e-6. Baking that matrix into the attribute writes sub-integer floats
   * back into a uint16 buffer, every vertex truncates to zero, and the whole
   * band collapses to a point — which renders as no metal at all. So the
   * transform rides on the Mesh instead.
   */
  matrix: THREE.Matrix4;
}

/**
 * Map the resolved asset URLs onto render roles.
 *
 * The role comes from the slot, not from anything inside the file — see the
 * note at the top of ringMaterials.ts. Null entries (no-halo heads, plain-gold
 * bands) are dropped here, so callers never see a part that has no GLB.
 */
export function ringPartSources(assets: RingModelAssets): RingPartSource[] {
  const slots: { url: string | null; role: PartRole }[] = [
    { url: assets.bandPath, role: "metal" },
    { url: assets.headPath, role: "metal" },
    { url: assets.diamondPath, role: "centerStone" },
    { url: assets.bandDiamondPath, role: "accentStone" },
    { url: assets.headDiamondPath, role: "accentStone" },
  ];
  return slots.flatMap(({ url, role }) => (url ? [{ url, role }] : []));
}

let loaderPromise: Promise<GLTFLoader> | null = null;

function getLoader(): Promise<GLTFLoader> {
  loaderPromise ??= MeshoptDecoder.ready.then(() => {
    // The head and band GLBs are EXT_meshopt_compression + KHR_mesh_quantization.
    // The decoder is bundled rather than pulled from a CDN so the viewer keeps
    // working offline, which is the point of mirroring the models locally.
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    return loader;
  });
  return loaderPromise;
}

/**
 * Rebuild a geometry with one normal per face.
 *
 * The centre-stone GLBs share vertices across facet boundaries and carry
 * averaged normals: measured against the true face normals they are off by up
 * to 70 degrees. Interpolating those across a facet turns a hard cut edge into
 * a smooth gradient, and the stone renders as a rounded white blob no matter
 * what the lighting does — the normals are simply describing a different shape
 * than the triangles do. The pave files do not have this problem (exactly 3
 * vertices per triangle, zero deviation), which is why only the melee showed
 * facets.
 *
 * Splitting every triangle and recomputing gives each facet its own flat
 * normal, which is what a cut stone actually has.
 */
function toFlatShaded(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  // Non-indexed, so no vertex is shared and this yields per-face normals.
  flat.computeVertexNormals();
  return flat;
}

/** We replace every material and use no maps, so uv and friends are dead weight. */
function stripToPositionNormal(geometry: THREE.BufferGeometry): void {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== "position" && name !== "normal") geometry.deleteAttribute(name);
  }
}

/**
 * Copy an attribute into a plain, de-normalised Float32 buffer.
 *
 * Required before baking a transform: `applyMatrix4` writes results straight
 * back into the backing array, so an integer or normalised attribute silently
 * truncates. `getX/getY/getZ` denormalise on the way out, so this is lossless.
 */
function toFloatAttribute(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
): THREE.BufferAttribute {
  const { count, itemSize } = attribute;
  const out = new THREE.BufferAttribute(new Float32Array(count * itemSize), itemSize);
  for (let i = 0; i < count; i++) {
    if (itemSize >= 1) out.setX(i, attribute.getX(i));
    if (itemSize >= 2) out.setY(i, attribute.getY(i));
    if (itemSize >= 3) out.setZ(i, attribute.getZ(i));
    if (itemSize >= 4) out.setW(i, attribute.getW(i));
  }
  return out;
}

/**
 * Flatten a loaded scene into one geometry plus the transform to draw it with,
 * disposing everything from the source that does not survive into the result.
 */
function flatten(root: THREE.Object3D): RingPartGeometry | null {
  const meshes: THREE.Mesh[] = [];
  root.updateWorldMatrix(false, true);
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry.getAttribute("position")) {
      meshes.push(child);
    }
  });

  // Nothing authored on the materials is used — see ringMaterials.ts.
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });

  const first = meshes[0];
  if (!first) return null;

  // Fast path. The metal files are a single mesh of up to ~1M triangles held in
  // interleaved, quantised buffers. Adopt the geometry untouched and hand the
  // node transform back to the caller: no clone, no de-interleaving, and no
  // chance of truncating a uint16 attribute.
  if (meshes.length === 1) {
    const geometry = first.geometry;
    stripToPositionNormal(geometry);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    return { geometry, matrix: first.matrixWorld.clone() };
  }

  // Merge path: thousands of small primitives, each with its own node transform,
  // so the transforms have to be baked. Convert to float first for the reason
  // above, which also guarantees the uniform layout mergeGeometries demands.
  const parts = meshes.map((mesh) => {
    const source = mesh.geometry;
    const geometry = new THREE.BufferGeometry();
    const position = source.getAttribute("position");
    if (position) geometry.setAttribute("position", toFloatAttribute(position));
    const normal = source.getAttribute("normal");
    if (normal) geometry.setAttribute("normal", toFloatAttribute(normal));
    if (source.index) geometry.setIndex(Array.from(source.index.array));
    if (!normal) geometry.computeVertexNormals();
    geometry.applyMatrix4(mesh.matrixWorld);
    return geometry;
  });
  meshes.forEach((mesh) => mesh.geometry.dispose());

  // mergeGeometries refuses a mix of indexed and non-indexed input.
  const allIndexed = parts.every((geometry) => geometry.index !== null);
  const normalised = allIndexed
    ? parts
    : parts.map((geometry) => {
        if (!geometry.index) return geometry;
        const expanded = geometry.toNonIndexed();
        geometry.dispose();
        return expanded;
      });

  const merged = mergeGeometries(normalised, false);
  normalised.forEach((geometry) => geometry.dispose());
  return { geometry: merged, matrix: new THREE.Matrix4() };
}

const cache = new Map<string, RingPartGeometry>();
const inFlight = new Map<string, Promise<RingPartGeometry>>();

/**
 * Load one GLB and return its merged geometry.
 *
 * Results are cached by URL, which matters more than it looks: changing metal
 * touches no geometry at all, and changing ring style reuses the head files.
 * Concurrent requests for the same URL share one parse.
 */
export async function loadPartGeometry(url: string, role: PartRole): Promise<RingPartGeometry> {
  // Keyed by url alone: a given file is always loaded into the same role.
  const cached = cache.get(url);
  if (cached) {
    // Refresh LRU position.
    cache.delete(url);
    cache.set(url, cached);
    return cached;
  }

  const pending = inFlight.get(url);
  if (pending) return pending;

  const request = (async () => {
    const loader = await getLoader();
    const gltf = await loader.loadAsync(url);
    const part = flatten(gltf.scene);
    if (!part) throw new Error(`No drawable geometry in ${url}`);
    // Only the stones. Metal is a smooth surface whose averaged normals are
    // correct, and flattening a million triangles of band would both cost
    // memory and turn a polished curve into a faceted one.
    if (role !== "metal") part.geometry = toFlatShaded(part.geometry);
    cache.set(url, part);
    return part;
  })();

  inFlight.set(url, request);
  try {
    return await request;
  } finally {
    inFlight.delete(url);
  }
}

/** Upper bound on cached models. Each entry is up to ~1M triangles of metal. */
const CACHE_LIMIT = 16;

/**
 * Evict least-recently-used geometry, never touching what is currently on
 * screen — disposing a geometry still bound to a live mesh would blank the
 * viewer. The caller passes the URLs it is still using.
 */
export function pruneGeometryCache(keep: Iterable<string>): void {
  const pinned = new Set(keep);
  for (const [url, part] of cache) {
    if (cache.size <= CACHE_LIMIT) break;
    if (pinned.has(url)) continue;
    part.geometry.dispose();
    cache.delete(url);
  }
}

/** Drop every cached geometry. Used when the viewer is torn down for good. */
export function clearGeometryCache(): void {
  cache.forEach((part) => part.geometry.dispose());
  cache.clear();
}
