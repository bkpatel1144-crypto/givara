/**
 * Faceted diamond geometry for every Givara shape.
 *
 * A stone is described by its girdle outline (a closed 2D curve in the XZ
 * plane, X = width, Z = length / "north–south"). Rings of that outline are
 * stacked into a table, crown, girdle and pavilion, with alternating offsets
 * to create brilliant-style facets. Units are millimetres; the girdle sits at
 * y = 0 and the table faces +Y.
 */
import * as THREE from "three";
import type { Carat, DiamondShape } from "@/types/ring";

export type Point2 = { x: number; z: number };

/** Segments around the girdle; round-ish stones use fewer for bolder facets. */
const SEGMENTS: Record<DiamondShape, number> = {
  round: 16,
  oval: 16,
  princess: 32,
  emerald: 32,
  radiant: 32,
  "elongated-cushion": 24,
  marquise: 32,
  pear: 32,
  heart: 40,
};

/** Length ÷ width of the face-up outline. */
const ASPECT: Record<DiamondShape, number> = {
  round: 1,
  oval: 1.4,
  princess: 1,
  emerald: 1.4,
  radiant: 1.25,
  "elongated-cushion": 1.35,
  marquise: 2,
  pear: 1.55,
  heart: 1,
};

/** Relative size so different shapes of the same carat look comparable. */
const SIZE_FACTOR: Record<DiamondShape, number> = {
  round: 1,
  oval: 0.95,
  princess: 0.86,
  emerald: 0.86,
  radiant: 0.88,
  "elongated-cushion": 0.9,
  marquise: 0.95,
  pear: 0.95,
  heart: 0.95,
};

/** Round 1ct ≈ 6.5 mm; diameter grows with the cube root of weight. */
export function stoneDimensions(shape: DiamondShape, carat: Carat | number) {
  const d = 6.5 * Math.cbrt(Number(carat) || 1) * SIZE_FACTOR[shape];
  const a = ASPECT[shape];
  const width = d / Math.sqrt(a);
  const length = d * Math.sqrt(a);
  const minDim = Math.min(width, length);
  return {
    width,
    length,
    crownHeight: 0.15 * minDim,
    pavilionDepth: 0.43 * minDim,
  };
}

const sgnPow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

/** Unit outline (roughly within [-1, 1]²), sampled at `count` parameter steps. */
function unitOutline(shape: DiamondShape, count: number): Point2[] {
  const pts: Point2[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    switch (shape) {
      case "round":
      case "oval":
        pts.push({ x: c, z: s });
        break;
      case "elongated-cushion":
        pts.push({ x: sgnPow(c, 2 / 2.8), z: sgnPow(s, 2 / 2.8) });
        break;
      case "princess":
        pts.push({ x: sgnPow(c, 2 / 14), z: sgnPow(s, 2 / 14) });
        break;
      case "emerald":
      case "radiant": {
        // Rectangle with cut corners: nearest hit of the ray on |x|≤1, |z|≤1, |x|+|z|≤2−chamfer.
        const chamfer = shape === "emerald" ? 0.42 : 0.3;
        const k = Math.min(
          1 / Math.max(Math.abs(c), 1e-6),
          1 / Math.max(Math.abs(s), 1e-6),
          (2 - chamfer) / (Math.abs(c) + Math.abs(s)),
        );
        pts.push({ x: c * k, z: s * k });
        break;
      }
      case "marquise": {
        // Pointed tips along ±Z.
        pts.push({ x: s * Math.pow(1 - Math.abs(c) + 1e-9, 0.55), z: c });
        break;
      }
      case "pear": {
        // Point at +Z, rounded end at −Z.
        pts.push({ x: s * Math.sqrt((1 - c) / 2), z: c });
        break;
      }
      case "heart": {
        const hx = 16 * s * s * s;
        const hz = 13 * c - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        // Tip pointing to −Z; normalised below.
        pts.push({ x: hx / 16, z: (hz + 2.5) / 14.5 });
        break;
      }
    }
  }
  return pts;
}

function normaliseOutline(pts: Point2[]): Point2[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const hx = (maxX - minX) / 2 || 1;
  const hz = (maxZ - minZ) / 2 || 1;
  return pts.map((p) => ({ x: (p.x - cx) / hx, z: (p.z - cz) / hz }));
}

/** Girdle outline in millimetres, centred on the origin. */
export function stoneOutline(
  shape: DiamondShape,
  width: number,
  length: number,
  count = SEGMENTS[shape],
): Point2[] {
  return normaliseOutline(unitOutline(shape, count)).map((p) => ({
    x: (p.x * width) / 2,
    z: (p.z * length) / 2,
  }));
}

/**
 * Parameter positions (0–1 around the outline) where prongs hold the stone.
 * Pointed shapes get a prong on each point.
 */
export function prongPositions(shape: DiamondShape): number[] {
  switch (shape) {
    case "pear":
      // Point at u = 0, rounded end around u = 0.5.
      return [0, 0.4, 0.6];
    case "heart":
      // Tip at u = 0.5, lobes either side of the cleft.
      return [0.5, 0.17, 0.83];
    case "marquise":
      // One prong on each point plus two along each side.
      return [0, 0.5, 0.2, 0.3, 0.7, 0.8];
    default:
      return [0.125, 0.375, 0.625, 0.875];
  }
}

/** Point on the outline at parameter `u` ∈ [0, 1), linearly interpolated. */
export function outlineAt(outline: Point2[], u: number): Point2 {
  const n = outline.length;
  const f = (((u % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const a = outline[i % n]!;
  const b = outline[(i + 1) % n]!;
  const k = f - i;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
}

/** Evenly spaced points by arc length, with outward normals. */
export function resampleOutline(
  outline: Point2[],
  count: number,
): { point: Point2; normal: Point2; tangent: Point2 }[] {
  const n = outline.length;
  const lengths = [0];
  for (let i = 0; i < n; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % n]!;
    lengths.push(lengths[i]! + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = lengths[n]!;
  const out: { point: Point2; normal: Point2; tangent: Point2 }[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (seg < n - 1 && lengths[seg + 1]! < target) seg++;
    const a = outline[seg]!;
    const b = outline[(seg + 1) % n]!;
    const segLen = lengths[seg + 1]! - lengths[seg]! || 1;
    const t = (target - lengths[seg]!) / segLen;
    const point = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    let normal = { x: tz / tl, z: -tx / tl };
    // Point the normal away from the stone centre.
    if (normal.x * point.x + normal.z * point.z < 0) normal = { x: -normal.x, z: -normal.z };
    out.push({ point, normal, tangent: { x: tx / tl, z: tz / tl } });
  }
  return out;
}

export function outlinePerimeter(outline: Point2[]): number {
  let total = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

type Ring3 = THREE.Vector3[];

/** Scale an outline towards its centre and optionally rotate by half a segment. */
function ringFrom(outline: Point2[], scale: number, y: number, halfOffset: boolean): Ring3 {
  const n = outline.length;
  return outline.map((_, i) => {
    const p = halfOffset ? outlineAt(outline, (i + 0.5) / n) : outline[i]!;
    return new THREE.Vector3(p.x * scale, y, p.z * scale);
  });
}

/**
 * Build a faceted stone. Normals are flat so each facet catches light on its own.
 */
export function createDiamondGeometry(
  shape: DiamondShape,
  width: number,
  length: number,
): THREE.BufferGeometry {
  const minDim = Math.min(width, length);
  const crown = 0.15 * minDim;
  const pavilion = 0.43 * minDim;
  const girdle = 0.018 * minDim;

  const outline = stoneOutline(shape, width, length);
  // Rings from the table down to the culet. `half` rings sit between the
  // vertices of their neighbours, which creates the kite/star facet pattern.
  // Each intermediate ring bulges slightly outwards so the solid stays convex.
  const rings: { pts: Ring3; half: boolean }[] = [
    { pts: ringFrom(outline, 0.58, crown, false), half: false }, // table edge
    { pts: ringFrom(outline, 0.76, crown * 0.62, true), half: true }, // star facets
    { pts: ringFrom(outline, 0.92, crown * 0.22, false), half: false }, // upper girdle
    { pts: ringFrom(outline, 1, girdle / 2, false), half: false }, // girdle top
    { pts: ringFrom(outline, 1, -girdle / 2, false), half: false }, // girdle bottom
    { pts: ringFrom(outline, 0.82, -pavilion * 0.3, true), half: true }, // lower girdle
    { pts: ringFrom(outline, 0.42, -pavilion * 0.72, false), half: false }, // pavilion mains
  ];
  const culet = new THREE.Vector3(0, -pavilion, 0);
  // A barely raised table centre splits the table into shallow facets, so a
  // large table catches light in patches instead of reading as one flat face.
  const tableCentre = new THREE.Vector3(0, crown + 0.025 * minDim, 0);

  const positions: number[] = [];
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    // Orient every triangle outwards from the stone centre.
    const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const outward = centroid.clone().sub(new THREE.Vector3(0, (crown - pavilion) / 2, 0));
    if (normal.dot(outward) < 0) positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    else positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };

  const n = outline.length;
  const at = (ring: Ring3, i: number) => ring[((i % n) + n) % n]!;

  /** Triangulate the band between two consecutive rings. */
  const band = (a: { pts: Ring3; half: boolean }, b: { pts: Ring3; half: boolean }) => {
    for (let i = 0; i < n; i++) {
      if (a.half === b.half) {
        pushTri(at(a.pts, i), at(b.pts, i), at(b.pts, i + 1));
        pushTri(at(a.pts, i), at(b.pts, i + 1), at(a.pts, i + 1));
      } else if (b.half) {
        // b[i] sits between a[i] and a[i + 1]
        pushTri(at(a.pts, i), at(b.pts, i), at(a.pts, i + 1));
        pushTri(at(b.pts, i - 1), at(a.pts, i), at(b.pts, i));
      } else {
        // a[i] sits between b[i] and b[i + 1]
        pushTri(at(b.pts, i), at(a.pts, i), at(b.pts, i + 1));
        pushTri(at(a.pts, i - 1), at(b.pts, i), at(a.pts, i));
      }
    }
  };

  const first = rings[0]!.pts;
  const last = rings[rings.length - 1]!.pts;
  for (let i = 0; i < n; i++) {
    pushTri(tableCentre, at(first, i), at(first, i + 1));
    pushTri(at(last, i), culet, at(last, i + 1));
  }
  for (let r = 0; r < rings.length - 1; r++) band(rings[r]!, rings[r + 1]!);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
