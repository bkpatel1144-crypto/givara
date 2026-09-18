/**
 * Lighting environment for the ring viewer.
 *
 * A cut stone has nothing to do except mirror its surroundings, so what the
 * environment looks like *is* what the diamond looks like. This used to build
 * that environment procedurally out of emissive boxes, and no amount of tuning
 * ever got past "obviously CGI": a box rig has no photographic structure, so
 * the metal picks up flat gradients instead of the hard-edged softbox shapes a
 * real studio puts on polished gold, and the stone mirrors those same smooth
 * gradients into mush.
 *
 * The reference builder ships two real captured HDRIs instead, one per
 * material class, and that split is deliberate: metal and gems want opposite
 * environments. Metal integrates the environment through a BRDF, so it wants
 * broad shaped sources. A gem mirrors it directly and one-to-one, so it wants
 * high contrast with genuinely dark regions for facets to land on. Both files
 * are mirrored into `public/environment/` alongside the GLBs.
 */
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/** Broad shaped sources, for the PBR metal. */
export const METAL_HDR_URL = "/environment/ringbodyenvironment.hdr";
/** High contrast with real darks, for the gem shader. */
export const GEM_HDR_URL = "/environment/diamondenvironment.hdr";

export interface EnvironmentTextures {
  /**
   * Assigned to `scene.environment`. three prefilters an equirectangular
   * texture into a PMREM internally, which is what the metal's roughness
   * lookup needs.
   */
  metal: THREE.Texture;
  /**
   * Handed to the gem shader as a plain `sampler2D` and sampled along its
   * traced rays. Deliberately *not* prefiltered: blurring is exactly what
   * would smear the facet flashes away.
   */
  gem: THREE.Texture;
}

let cache: Promise<EnvironmentTextures> | null = null;

function load(url: string): Promise<THREE.DataTexture> {
  return new Promise((resolve, reject) => {
    new RGBELoader().load(
      url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`Failed to load environment ${url}`)),
    );
  });
}

/**
 * Load both maps once and share them across every viewer instance. They are
 * ~1.8 MB together and never change, so re-decoding per mount would be pure
 * waste.
 */
export function loadEnvironmentTextures(): Promise<EnvironmentTextures> {
  cache ??= Promise.all([load(METAL_HDR_URL), load(GEM_HDR_URL)]).then(([metal, gem]) => ({
    metal,
    gem,
  }));
  return cache;
}
