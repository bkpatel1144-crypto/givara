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

/**
 * Build the environment the metal actually reflects.
 *
 * The reference's `ringbodyenvironment.hdr` is a soft synthetic light tent:
 * smooth grey gradients, a couple of small lamps, peak radiance about 34.
 * Decoded and looked at directly it has almost no hard edges, and that is what
 * capped the metal's realism. A polished surface is a mirror, so it can only
 * show what surrounds it — mirror a soft gradient and you get a soft gradient,
 * which is the airbrushed look. It is also why roughness barely mattered:
 * moving it from 0.15 to 0.03 changed the render by a mean of 0.05 levels,
 * because there was no detail present to sharpen.
 *
 * The fix is not more light. Adding bright panels on top of the HDRI was tried
 * and measured worse on every count — gold went from 168 to 185 while contrast
 * fell from 38 to 32 and saturation from 72 to 67: brighter, flatter, paler.
 *
 * What works is what a bench photographer actually does: surround the piece
 * with *black flags*. They cost nothing in brightness because they only ever
 * subtract, and they give the metal the hard light-to-dark transitions it had
 * no way to find in a smooth tent. On the shank that becomes a bright specular
 * streak against a deep band, which is what reads as polished gold instead of
 * a shaded tube. Measured on the shank, contrast goes from 24 to 79.
 *
 * The flags cost brightness, so `MATERIAL_TUNING.metalEnvIntensity` puts the
 * level back afterwards.
 */

/**
 * How dark the flags go. Not zero: pure black crushes the shank's dark band to
 * 0 and the metal reads as having a hole in it rather than a shadow.
 */
export const STUDIO_FLAG = 0.12;

function studioFlag(
  geometry: THREE.BoxGeometry,
  intensity: number,
  position: [number, number, number],
  scale: [number, number, number],
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial();
  material.color.setScalar(intensity);
  material.toneMapped = false;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

export function buildMetalEnvironment(
  renderer: THREE.WebGLRenderer,
  hdr: THREE.Texture,
  flag = STUDIO_FLAG,
): THREE.Texture {
  const scene = new THREE.Scene();
  // The reference environment, unchanged, behind everything.
  scene.background = hdr;

  const geometry = new THREE.BoxGeometry();
  geometry.deleteAttribute("uv");

  // Overhead, split front-to-back. The split is the point: an unbroken view of
  // the tent gives one soft highlight, where flag-gap-flag gives the
  // bright / dark / bright banding that runs the length of a polished band.
  scene.add(studioFlag(geometry, flag, [0, 6.5, 1.5], [13, 0.4, 5]));
  scene.add(studioFlag(geometry, flag, [0, 6.2, -1.4], [13.4, 0.5, 1.6]));
  scene.add(studioFlag(geometry, flag, [0, 6.5, -4.6], [13, 0.4, 4]));

  // Sides, so the band picks up a hard edge as it curves away rather than
  // fading off into grey.
  scene.add(studioFlag(geometry, flag, [-7.5, 1.6, 1.5], [0.4, 6, 9]));
  scene.add(studioFlag(geometry, flag, [-7.1, 1.6, -4.2], [0.5, 6.4, 2.4]));
  scene.add(studioFlag(geometry, flag, [7.5, 1.0, -0.5], [0.4, 5.5, 8]));
  scene.add(studioFlag(geometry, flag, [7.1, 1.0, 4.4], [0.5, 5.9, 2.2]));

  // Low front, which is what gives the underside of the shank an edge instead
  // of letting it wash out into the floor of the tent.
  scene.add(studioFlag(geometry, flag, [0, -3.4, 6.5], [10, 2.4, 0.4]));

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const texture = pmrem.fromScene(scene, 0, 0.1, 100).texture;
  pmrem.dispose();

  geometry.dispose();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose();
  });
  return texture;
}
