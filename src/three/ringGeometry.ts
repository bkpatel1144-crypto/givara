/**
 * GLB loading, geometry flattening and caching for the ring viewer.
 *
 * Two different jobs, decided by the part's role:
 *
 * **Metal** is merged as hard as possible. `Shank_*_Band.glb` is one mesh of up
 * to ~1M triangles, and the accent files are pathological — 10,633 separate
 * primitives describing 14,798 triangles. Every primitive in a file shares one
 * material, so baking each file down to a single BufferGeometry turns ~14,100
 * draw calls into one.
 *
 * **Stones** are merged only *within* each stone. The gem shader traces rays
 * against a cubemap baked from one stone's own surface, around that stone's own
 * centre, so a band of 20 melee cannot share a geometry: fused into one blob
 * they would share one bounding sphere and one centre, every trace would
 * intersect the wrong hull, and the whole rail would render as grey sludge. So
 * the 4,340 primitives of a pavé band come back as 20 geometries of 217 — one
 * per stone, 20 draw calls, each traceable on its own terms.
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

export interface RingPartPiece {
  geometry: THREE.BufferGeometry;
  /**
   * The piece's node transform, deliberately kept *off* the geometry.
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

/** One GLB, resolved to everything that should be drawn from it. */
export interface RingPart {
  pieces: RingPartPiece[];
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
 * a smooth gradient, and the stone renders as a rounded blob no matter what the
 * lighting does — the normals are simply describing a different shape than the
 * triangles do.
 *
 * This matters twice over now: those normals are also what gets baked into the
 * trace cubemap, so smoothed normals would describe a smooth stone to the ray
 * tracer as well, and no facet would ever be found.
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

/** Merge a run of meshes into one geometry, baking each one's world transform. */
function mergeMeshes(meshes: THREE.Mesh[]): THREE.BufferGeometry | null {
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
  return merged;
}

/**
 * Flatten a loaded scene into the pieces that should be drawn from it.
 *
 * `groupPerParent` is what separates the two jobs described at the top. glTF
 * gives a multi-primitive mesh as a Group of Mesh children, so grouping by
 * parent is exactly "one piece per stone".
 */
function flatten(root: THREE.Object3D, groupPerParent: boolean): RingPartPiece[] {
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
  if (!first) return [];

  // Fast path. A single-mesh file (every metal part, and the centre stone)
  // needs no merge at all: adopt the geometry untouched and hand the node
  // transform back to the caller. No clone, no de-interleaving, and no chance
  // of truncating a uint16 attribute.
  if (meshes.length === 1) {
    const geometry = first.geometry;
    stripToPositionNormal(geometry);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    return [{ geometry, matrix: first.matrixWorld.clone() }];
  }

  const groups = new Map<string, THREE.Mesh[]>();
  for (const mesh of meshes) {
    // One bucket per stone when grouping, one bucket for everything otherwise.
    const key = groupPerParent ? (mesh.parent?.uuid ?? mesh.uuid) : "all";
    const bucket = groups.get(key);
    if (bucket) bucket.push(mesh);
    else groups.set(key, [mesh]);
  }

  const pieces: RingPartPiece[] = [];
  for (const bucket of groups.values()) {
    const merged = mergeMeshes(bucket);
    // Transforms are baked by mergeMeshes, so the piece draws at identity.
    if (merged) pieces.push({ geometry: merged, matrix: new THREE.Matrix4() });
  }
  meshes.forEach((mesh) => mesh.geometry.dispose());
  return pieces;
}

const cache = new Map<string, RingPart>();
const inFlight = new Map<string, Promise<RingPart>>();

/**
 * Load one GLB and return its drawable pieces.
 *
 * Results are cached by URL, which matters more than it looks: changing metal
 * touches no geometry at all, and changing ring style reuses the head files.
 * Concurrent requests for the same URL share one parse.
 */
export async function loadPartGeometry(url: string, role: PartRole): Promise<RingPart> {
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
    const isStone = role !== "metal";
    const pieces = flatten(gltf.scene, isStone);
    if (pieces.length === 0) throw new Error(`No drawable geometry in ${url}`);
    // Only the stones. Metal is a smooth surface whose averaged normals are
    // correct, and flattening a million triangles of band would both cost
    // memory and turn a polished curve into a faceted one.
    if (isStone) {
      for (const piece of pieces) piece.geometry = toFlatShaded(piece.geometry);
    }
    const part: RingPart = { pieces };
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
    part.pieces.forEach((piece) => piece.geometry.dispose());
    cache.delete(url);
  }
}

/** Every geometry uuid currently held, so dependent caches can prune in step. */
export function cachedGeometryIds(): Set<string> {
  const ids = new Set<string>();
  cache.forEach((part) => part.pieces.forEach((piece) => ids.add(piece.geometry.uuid)));
  return ids;
}

/** Drop every cached geometry. Used when the viewer is torn down for good. */
export function clearGeometryCache(): void {
  cache.forEach((part) => part.pieces.forEach((piece) => piece.geometry.dispose()));
  cache.clear();
}
