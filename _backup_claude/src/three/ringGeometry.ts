/**
 * Procedural engagement ring built from the configuration, in millimetres.
 *
 * Orientation: the finger passes along the Z axis, the band lies in the XY
 * plane and the centre stone sits on top (+Y). Band angle `u` is measured
 * from the top of the ring (u = 0) towards +X.
 */
import * as THREE from "three";
import { innerDiameterMm } from "@/data/ringSizes";
import type { RingConfiguration } from "@/types/ring";
import {
  createDiamondGeometry,
  outlineAt,
  outlinePerimeter,
  prongPositions,
  resampleOutline,
  stoneDimensions,
  stoneOutline,
  type Point2,
} from "./diamondGeometry";

export type RingGeometryConfig = Pick<
  RingConfiguration,
  "ringStyle" | "sideSetting" | "crownSetting" | "diamondShape" | "centerDiamondSize" | "ringSize"
>;

export interface RingMaterials {
  metal: THREE.Material;
  diamond: THREE.Material;
  accent: THREE.Material;
}

interface Frame {
  center: THREE.Vector3;
  /** Outward radial direction. */
  r: THREE.Vector3;
  /** Axial direction (along the finger). */
  z: THREE.Vector3;
  halfT: number;
  halfW: number;
}

interface Strand {
  frame: (u: number) => Frame;
  /** Superellipse exponent of the cross-section (2 = round, 4 = soft rectangle). */
  exponent: number;
}

const TAU = Math.PI * 2;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const bump = (u: number, width: number) => Math.exp(-((u / width) ** 2));

function radial(u: number) {
  return new THREE.Vector3(Math.sin(u), Math.cos(u), 0);
}

function tangent(u: number) {
  return new THREE.Vector3(Math.cos(u), -Math.sin(u), 0);
}

/** Sweep a superellipse cross-section along a strand. */
function sweep(
  strand: Strand,
  { uStart = -Math.PI, uEnd = Math.PI, closed = true, uSegments = 220, vSegments = 18 } = {},
): THREE.BufferGeometry {
  const rows = closed ? uSegments : uSegments + 1;
  const positions = new Float32Array(rows * vSegments * 3);
  const p = 2 / strand.exponent;
  let o = 0;
  for (let i = 0; i < rows; i++) {
    const u = uStart + ((uEnd - uStart) * i) / uSegments;
    const f = strand.frame(u);
    for (let j = 0; j < vSegments; j++) {
      const v = (j / vSegments) * TAU;
      const c = Math.cos(v);
      const s = Math.sin(v);
      const px = Math.sign(c) * Math.abs(c) ** p * f.halfT;
      const pz = Math.sign(s) * Math.abs(s) ** p * f.halfW;
      positions[o++] = f.center.x + f.r.x * px + f.z.x * pz;
      positions[o++] = f.center.y + f.r.y * px + f.z.y * pz;
      positions[o++] = f.center.z + f.r.z * px + f.z.z * pz;
    }
  }
  const indices: number[] = [];
  const quads = closed ? rows : rows - 1;
  for (let i = 0; i < quads; i++) {
    const i1 = (i + 1) % rows;
    for (let j = 0; j < vSegments; j++) {
      const j1 = (j + 1) % vSegments;
      const a = i * vSegments + j;
      const b = i1 * vSegments + j;
      const c = i1 * vSegments + j1;
      const d = i * vSegments + j1;
      // (a, d, b) and (b, d, c) face outwards for the r × z = tangent frame.
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function tube(points: THREE.Vector3[], radius: number, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, 12, closed);
}

/** Build the band strands for the chosen ring style. */
function bandStrands(config: RingGeometryConfig, rc: number): Strand[] {
  const channel = config.sideSetting === "channel";
  const halfW = channel ? 1.2 : 1.0;
  const halfT = 0.85;

  const single = (widthAt: (u: number) => number): Strand => ({
    exponent: 4,
    frame: (u) => ({
      center: radial(u).multiplyScalar(rc),
      r: radial(u),
      z: Z_AXIS.clone(),
      halfT,
      halfW: widthAt(u),
    }),
  });

  switch (config.ringStyle) {
    case "pinch":
      return [single((u) => halfW * (1 - 0.38 * bump(u, 0.55)))];
    case "split":
    case "two-row-split": {
      const spread = config.ringStyle === "split" ? 1.35 : 1.9;
      const strandHalfW = config.ringStyle === "split" ? halfW * 0.52 : halfW * 0.62;
      return [-1, 1].map((side) => ({
        exponent: 4,
        frame: (u: number) => {
          const offset = side * (halfW * 0.48 + spread * bump(u, 0.75));
          return {
            center: radial(u).multiplyScalar(rc).addScaledVector(Z_AXIS, offset),
            r: radial(u),
            z: Z_AXIS.clone(),
            halfT: halfT * 0.9,
            halfW: strandHalfW,
          };
        },
      }));
    }
    case "twist":
      return [0, Math.PI].map((phase) => ({
        exponent: 2.4,
        frame: (u: number) => {
          // One crossover per side: strands sit side by side under the head,
          // cross at the shoulders and swap sides at the bottom. The integer
          // multiple of u keeps the strands continuous around the loop.
          const phi = phase + Math.PI / 2 + u;
          const amp = 0.55 + 0.6 * bump(u, 0.9);
          const r = radial(u);
          return {
            center: r
              .clone()
              .multiplyScalar(rc + amp * 0.35 * Math.cos(phi))
              .addScaledVector(Z_AXIS, amp * Math.sin(phi)),
            r,
            z: Z_AXIS.clone(),
            halfT: 0.62,
            halfW: 0.62,
          };
        },
      }));
    default:
      return [single(() => halfW)];
  }
}

function addInstanced(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: THREE.Matrix4[],
) {
  if (matrices.length === 0) {
    geometry.dispose();
    return;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

/** Matrix placing a unit stone/bead with its +Y along `normal` and +X along `along`. */
function placement(
  position: THREE.Vector3,
  normal: THREE.Vector3,
  along: THREE.Vector3,
  scale: number,
) {
  const y = normal.clone().normalize();
  const x = along.clone().addScaledVector(y, -along.dot(y)).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.scale(new THREE.Vector3(scale, scale, scale));
  m.setPosition(position);
  return m;
}

export function buildRing(config: RingGeometryConfig, materials: RingMaterials): THREE.Group {
  const group = new THREE.Group();
  const innerRadius = innerDiameterMm(Number(config.ringSize) || 7) / 2;
  const rc = innerRadius + 0.85;
  const bandTop = rc + 0.85;

  // ---------------------------------------------------------------- stone
  const dims = stoneDimensions(config.diamondShape, config.centerDiamondSize);
  const { width: W, length: L, crownHeight: crown, pavilionDepth: pav } = dims;
  const girdleY = bandTop + 0.55 + pav;
  const outline = stoneOutline(config.diamondShape, W, L, 96);

  const stone = new THREE.Mesh(createDiamondGeometry(config.diamondShape, W, L), materials.diamond);
  stone.position.y = girdleY;
  group.add(stone);

  // ---------------------------------------------------------------- band
  const strands = bandStrands(config, rc);
  for (const strand of strands) {
    group.add(new THREE.Mesh(sweep(strand), materials.metal));
  }

  const isSplit = config.ringStyle === "split" || config.ringStyle === "two-row-split";
  if (isSplit || config.ringStyle === "twist") {
    // Bridge under the head joining the separated strands.
    const spread = isSplit ? (config.ringStyle === "split" ? 2.0 : 2.6) : 1.3;
    group.add(
      new THREE.Mesh(
        tube(
          [
            new THREE.Vector3(0, rc + 0.2, -spread),
            new THREE.Vector3(0, bandTop - 0.1, 0),
            new THREE.Vector3(0, rc + 0.2, spread),
          ],
          0.55,
        ),
        materials.metal,
      ),
    );
  }

  // ---------------------------------------------------------------- head
  const prongRadius = 0.3 + 0.08 * Math.cbrt(Number(config.centerDiamondSize) || 1);
  const galleryY = girdleY - pav * 0.55;

  for (const u of prongPositions(config.diamondShape)) {
    const p = outlineAt(outline, u);
    const len = Math.hypot(p.x, p.z) || 1;
    const dir = { x: p.x / len, z: p.z / len };
    const at = (radius: number, y: number) => new THREE.Vector3(dir.x * radius, y, dir.z * radius);
    const tip = at(len - 0.1, girdleY + crown * 0.72);
    group.add(
      new THREE.Mesh(
        tube(
          [at(len * 0.3, bandTop - 0.4), at(len * 0.82, galleryY), at(len + 0.28, girdleY), tip],
          prongRadius,
        ),
        materials.metal,
      ),
    );
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(prongRadius * 1.15, 16, 12),
      materials.metal,
    );
    bead.position.copy(tip);
    group.add(bead);
  }

  const ringAt = (scale: number, y: number, offset = 0) =>
    resampleOutline(outline, 48).map(
      ({ point, normal }) =>
        new THREE.Vector3(
          point.x * scale + normal.x * offset,
          y,
          point.z * scale + normal.z * offset,
        ),
    );

  // Gallery rails that hold the prongs together.
  group.add(new THREE.Mesh(tube(ringAt(0.8, galleryY), 0.26, true), materials.metal));
  group.add(new THREE.Mesh(tube(ringAt(0.42, bandTop + 0.2), 0.3, true), materials.metal));

  if (config.ringStyle === "cathedral-straight") {
    for (const side of [-1, 1]) {
      const shoulder = radial(side * 0.8).multiplyScalar(rc);
      group.add(
        new THREE.Mesh(
          tube(
            [
              shoulder,
              new THREE.Vector3(side * W * 0.55, bandTop + 0.2, 0),
              new THREE.Vector3(side * W * 0.4, galleryY, 0),
            ],
            0.62,
          ),
          materials.metal,
        ),
      );
    }
  }

  // ---------------------------------------------------------------- halo
  const accentGeometry = () => createDiamondGeometry("round", 1, 1);
  const up = new THREE.Vector3(0, 1, 0);

  if (config.crownSetting === "hidden-halo") {
    // Stones tucked directly under the girdle, facing outwards: invisible from
    // above (the centre stone covers them) and a neat sparkling collar from the side.
    const size = 0.8;
    const inset = 0.1 + size * 0.5; // keeps each stone's outer edge inside the girdle
    const count = Math.max(10, Math.floor((outlinePerimeter(outline) * 0.85) / (size * 1.05)));
    const y = girdleY - size * 0.55 - 0.05;
    const matrices = resampleOutline(outline, count).map(({ point, normal, tangent: t }) => {
      const pos = new THREE.Vector3(point.x - normal.x * inset, y, point.z - normal.z * inset);
      const facing = new THREE.Vector3(normal.x, 0.35, normal.z);
      return placement(pos, facing, new THREE.Vector3(t.x, 0, t.z), size);
    });
    addInstanced(group, accentGeometry(), materials.accent, matrices);
    // Metal collar holding the halo stones.
    const collar = resampleOutline(outline, 64).map(
      ({ point, normal }) =>
        new THREE.Vector3(
          point.x - normal.x * (inset + size * 0.45),
          y - size * 0.45,
          point.z - normal.z * (inset + size * 0.45),
        ),
    );
    group.add(new THREE.Mesh(tube(collar, 0.4, true), materials.metal));
  }

  if (config.crownSetting === "single-halo") {
    const size = 1.2;
    const offset = size * 0.5 + 0.3;
    const haloOutline: Point2[] = resampleOutline(outline, 96).map(({ point, normal }) => ({
      x: point.x + normal.x * offset,
      z: point.z + normal.z * offset,
    }));
    const count = Math.max(12, Math.floor(outlinePerimeter(haloOutline) / (size * 1.12)));
    const y = girdleY - 0.15;
    const matrices = resampleOutline(haloOutline, count).map(({ point, normal, tangent: t }) => {
      const n = new THREE.Vector3(normal.x * 0.25, 1, normal.z * 0.25);
      return placement(
        new THREE.Vector3(point.x, y, point.z),
        n,
        new THREE.Vector3(t.x, 0, t.z),
        size,
      );
    });
    addInstanced(group, accentGeometry(), materials.accent, matrices);
    const frame = resampleOutline(haloOutline, 64).map(
      ({ point }) => new THREE.Vector3(point.x, y - 0.55, point.z),
    );
    group.add(new THREE.Mesh(tube(frame, 0.6, true), materials.metal));
    // Connect the halo frame to the gallery.
    for (const u of [0.125, 0.375, 0.625, 0.875]) {
      const p = outlineAt(haloOutline, u);
      const q = outlineAt(outline, u);
      group.add(
        new THREE.Mesh(
          tube(
            [
              new THREE.Vector3(p.x, y - 0.55, p.z),
              new THREE.Vector3(q.x * 0.8, galleryY, q.z * 0.8),
            ],
            0.35,
          ),
          materials.metal,
        ),
      );
    }
  }

  // ---------------------------------------------------------------- side stones
  if (config.sideSetting !== "plain-gold") {
    const spec = {
      pave: { size: 1.05, gap: 0.18, uMax: 1.2, beads: true },
      prong: { size: 1.35, gap: 0.45, uMax: 1.05, beads: true },
      channel: { size: 1.45, gap: 0.08, uMax: 1.1, beads: false },
    }[config.sideSetting];

    const headHalfWidth = Math.max(W, config.crownSetting === "single-halo" ? W + 2.6 : W) / 2;
    const uStart = Math.asin(Math.min(0.95, (headHalfWidth * 0.75 + 0.9) / bandTop));
    const stoneMatrices: THREE.Matrix4[] = [];
    const beadMatrices: THREE.Matrix4[] = [];
    const rails: THREE.BufferGeometry[] = [];

    // Split bands carry a row on each strand; a twist sets stones on one strand
    // only, leaving the other polished. Rails only fit on a full-width band.
    const rowStrands = config.ringStyle === "twist" ? strands.slice(0, 1) : strands;
    const size = strands.length > 1 ? Math.min(spec.size, 0.95) : spec.size;
    const useRails = config.sideSetting === "channel" && strands.length === 1;
    const step = (size + spec.gap) / bandTop;

    for (const strand of rowStrands) {
      for (const side of [-1, 1]) {
        for (let u = uStart; u <= spec.uMax; u += step) {
          const f = strand.frame(side * u);
          const t = tangent(side * u);
          const seat = f.center.clone().addScaledVector(f.r, f.halfT - size * 0.12);
          stoneMatrices.push(placement(seat, f.r, t, size));
          if (spec.beads) {
            const beadU = side * (u + step / 2);
            const fb = strand.frame(beadU);
            for (const edge of [-1, 1]) {
              const bead = fb.center
                .clone()
                .addScaledVector(fb.r, fb.halfT + 0.05)
                .addScaledVector(fb.z, edge * Math.min(fb.halfW * 0.8, size * 0.5));
              beadMatrices.push(placement(bead, fb.r, t, 1));
            }
          }
        }
        if (useRails) {
          for (const edge of [-1, 1]) {
            rails.push(
              sweep(
                {
                  exponent: 2.5,
                  frame: (u) => {
                    const f = strand.frame(u);
                    return {
                      center: f.center
                        .clone()
                        .addScaledVector(f.r, f.halfT + 0.12)
                        .addScaledVector(f.z, edge * (f.halfW - 0.2)),
                      r: f.r,
                      z: f.z,
                      halfT: 0.32,
                      halfW: 0.2,
                    };
                  },
                },
                {
                  closed: false,
                  uStart: side > 0 ? uStart - step * 0.6 : -spec.uMax - step * 0.4,
                  uEnd: side > 0 ? spec.uMax + step * 0.4 : -uStart + step * 0.6,
                  uSegments: 60,
                  vSegments: 10,
                },
              ),
            );
          }
        }
      }
    }

    const accent =
      config.sideSetting === "channel" ? createDiamondGeometry("princess", 1, 1) : accentGeometry();
    addInstanced(group, accent, materials.accent, stoneMatrices);
    addInstanced(group, new THREE.SphereGeometry(0.2, 10, 8), materials.metal, beadMatrices);
    for (const rail of rails) group.add(new THREE.Mesh(rail, materials.metal));
  }

  return group;
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
}
