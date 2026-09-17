/**
 * Materials for the ring viewer.
 *
 * The source GLBs cannot be trusted for appearance: the centre stone ships as
 * `DIA-RNDHD-B1-1` with a near-black blue base colour, the head as `WhiteMetal`
 * with a black base colour, and the band as `None (2)` with metalness 0 and
 * roughness 0.94 — i.e. a rough dielectric, not gold. So we do not tint what
 * came out of the file, we replace every material outright and decide which one
 * to use from the *slot the GLB was loaded into* (see `PartRole`), never from
 * the material name.
 *
 * That distinction is the whole ballgame: the previous name-sniffing pass
 * ("does the name contain diamond/stone/gem") missed `DIA-RNDHD-B1-1` and so
 * painted the centre diamond solid gold.
 */
import * as THREE from "three";
import type { Metal } from "@/types/ring";
import { createGemMaterial } from "./GemMaterial";

/** Which material a loaded GLB should be given. */
export type PartRole = "metal" | "centerStone" | "accentStone";

/**
 * Linear-space albedo for polished precious metals. These are measured
 * reflectance values rather than sRGB swatches, so they are fed through
 * `setRGB(..., LinearSRGBColorSpace)` instead of a hex literal — passing them
 * as hex would apply an sRGB decode and wash the metals out.
 */
const METAL_ALBEDO: Record<Metal, readonly [number, number, number]> = {
  "White Gold": [0.962, 0.949, 0.922],
  "Yellow Gold": [1.0, 0.766, 0.336],
  "Rose Gold": [0.955, 0.638, 0.538],
};

/** Tuning knobs, grouped so they are easy to find and adjust by eye. */
export const MATERIAL_TUNING = {
  /**
   * Polished gold is very smooth, but a perfect mirror reads as chrome. A
   * little roughness keeps the highlight rolling along the band.
   */
  metalRoughness: 0.14,
  /**
   * Kept near 1. Pushing environment gain on a metal drives its highlights
   * past white, and once they clip the hue goes with them — which is what
   * makes yellow gold render as pale cream.
   */
  metalEnvIntensity: 1.05,

  /**
   * `envIntensity` is small on purpose, and it is the single most important
   * number here.
   *
   * The studio panels sit at 8-14 and the hot accents at 30-78 — values chosen
   * so the *metal* has headroom, since three's PBR path prefilters the
   * environment and integrates it against a BRDF, which averages those down.
   * The gem shader has no such averaging: it samples the sharp cubemap and
   * returns the value. At a gain of 1 every facet that catches any panel comes
   * back at 8 or more, tone maps to pure white, and the whole stone clips to a
   * flat blob — which is exactly what "looks like milk" was.
   *
   * At this gain the range lands where it should: the dark room maps to ~0.03
   * (near-black facets), the panels to ~0.5-1.0 (bright facets), and the hot
   * accents to 4+ (deliberately blown-out sparkle points).
   */
  centerGem: {
    // Matched to the melee below, which renders correctly under this same
    // shader and cubemap. A higher `pavilion` scatters the internal bounce
    // further off-axis, and on the large centre stone that was steering most
    // facets into the dark side of the rig while the melee stayed bright.
    envIntensity: 0.16,
    pavilion: 0.3,
    reflectivity: 1,
    brightness: 1,
  },
  /**
   * Melee is half a millimetre across; each stone covers a few pixels. Damping
   * the scatter keeps a pave rail from boiling into noise as the ring turns.
   */
  accentGem: {
    // A shade hotter than the centre: melee covers a few pixels each, so it
    // needs to punch to register at all.
    envIntensity: 0.16,
    pavilion: 0.3,
    reflectivity: 1,
    brightness: 1,
  },
};

export function metalColor(metal: Metal): THREE.Color {
  const [r, g, b] = METAL_ALBEDO[metal];
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

function createMetalMaterial(metal: Metal): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: metalColor(metal),
    metalness: 1,
    roughness: MATERIAL_TUNING.metalRoughness,
    envMapIntensity: MATERIAL_TUNING.metalEnvIntensity,
  });
}

/**
 * @param gemEnvMap Sharp environment cubemap for the gem shader. Stones do not
 * use three's `transmission`: it refracts the framebuffer, and behind these
 * stones is a flat backdrop, so it can only ever produce flat milk. See
 * GemMaterial.ts.
 */
export function createMaterial(
  role: PartRole,
  metal: Metal,
  gemEnvMap: THREE.CubeTexture,
): THREE.Material {
  switch (role) {
    case "metal":
      return createMetalMaterial(metal);
    case "centerStone":
      return createGemMaterial({ envMap: gemEnvMap, ...MATERIAL_TUNING.centerGem });
    case "accentStone":
      return createGemMaterial({ envMap: gemEnvMap, ...MATERIAL_TUNING.accentGem });
  }
}

/**
 * Recolour in place. Changing metal must not rebuild geometry or materials —
 * it is the cheapest control in the UI and should feel instant.
 */
export function applyMetalColor(material: THREE.MeshPhysicalMaterial, metal: Metal): void {
  material.color.copy(metalColor(metal));
}
