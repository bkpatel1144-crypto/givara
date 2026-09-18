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
 *
 * The metal values below are the reference builder's, lifted verbatim. They had
 * been guessed at before from measured linear reflectance, which is defensible
 * physics and still looked wrong, because the look of polished jewellery is not
 * albedo — it is the clearcoat on white gold, the exact roughness, and an
 * environment gain well above 1.
 */
import * as THREE from "three";
import type { Metal } from "@/types/ring";

/** Which material a loaded GLB should be given. */
export type PartRole = "metal" | "centerStone" | "accentStone";

interface MetalPreset {
  /** sRGB hex, converted on the way into THREE.Color. */
  color: number;
  roughness: number;
  /**
   * White gold is rhodium plated, and that plating is a genuine dielectric
   * layer over the metal — not a stylistic choice. It is what gives the white
   * band its hard, wet-looking highlight.
   */
  clearcoat: number;
  clearcoatRoughness: number;
}

const METAL_PRESETS: Record<Metal, MetalPreset> = {
  "White Gold": { color: 0xc8c8c8, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.15 },
  "Yellow Gold": { color: 0xdab072, roughness: 0.15, clearcoat: 0, clearcoatRoughness: 0.15 },
  "Rose Gold": { color: 0xeaaa80, roughness: 0.08, clearcoat: 0, clearcoatRoughness: 0.15 },
};

export const MATERIAL_TUNING = {
  /**
   * Environment gain for the metal. Unit gain, deliberately.
   *
   * The reference threads a `metalEnvIntensity` of 1.8 down through its model
   * component, which is tempting to copy — but follow it and it is never
   * applied to anything: the material is built with the preset's own
   * `envMapIntensity`, which is 1. The 1.8 is dead. Using it makes the band
   * clip: gold pushed past white loses its hue with the highlight and the
   * whole ring reads as pale cream.
   *
   * The HDRI is a real capture and already carries the range this needs.
   */
  metalEnvIntensity: 1,
};

export function metalColor(metal: Metal): THREE.Color {
  return new THREE.Color(METAL_PRESETS[metal].color);
}

function createMetalMaterial(metal: Metal, envMapIntensity: number): THREE.MeshPhysicalMaterial {
  const preset = METAL_PRESETS[metal];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(preset.color),
    metalness: 1,
    roughness: preset.roughness,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: preset.clearcoatRoughness,
    envMapIntensity,
    // The band is an open shape and the camera goes inside it on the engraving
    // view, so back faces have to draw.
    side: THREE.DoubleSide,
  });
}

export function createMetal(metal: Metal, envMapIntensity: number): THREE.MeshPhysicalMaterial {
  return createMetalMaterial(metal, envMapIntensity);
}

/**
 * Recolour in place. Changing metal must not rebuild geometry or materials —
 * it is the cheapest control in the UI and should feel instant. Roughness and
 * clearcoat differ per metal too, so they move with the colour.
 */
export function applyMetalColor(material: THREE.MeshPhysicalMaterial, metal: Metal): void {
  const preset = METAL_PRESETS[metal];
  material.color.set(preset.color);
  material.roughness = preset.roughness;
  material.clearcoat = preset.clearcoat;
  material.clearcoatRoughness = preset.clearcoatRoughness;
  material.needsUpdate = true;
}
