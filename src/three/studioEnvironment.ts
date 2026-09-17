/**
 * Procedural lighting environment for the ring viewer.
 *
 * A cut stone has nothing to do except mirror its surroundings, so what the
 * environment looks like *is* what the diamond looks like. Two obvious setups
 * both fail, and this file is the third:
 *
 *   - An even bright tent (or three's stock RoomEnvironment) gives high light
 *     return but no structure. Every facet samples the same value, adjacent
 *     facets come out identical, the facet edges vanish and the stone renders
 *     as a smooth white blob.
 *   - A dark room with small hot sparks has plenty of contrast, but the sparks
 *     cover so little solid angle that most facets miss them entirely and land
 *     on darkness. The stone goes grey and dirty.
 *
 * What works is *large* bright panels separated by *large* dark gaps. Roughly
 * half of all directions are bright, so light return stays high and the stone
 * reads bright; the other half are dark, so neighbouring facets land on
 * opposite sides of a hard edge and the cut shows. That alternation is also
 * what draws the bright/dark bands along a polished band of metal.
 *
 * Small hot accents are still here, but as a garnish on top of that structure
 * rather than as the structure itself.
 */
import * as THREE from "three";

/** Box geometry shared by every panel; uv is unused by MeshBasicMaterial here. */
function panelGeometry(): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry();
  geometry.deleteAttribute("uv");
  return geometry;
}

function panel(
  geometry: THREE.BoxGeometry,
  intensity: number,
  position: [number, number, number],
  scale: [number, number, number],
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial();
  // Values above 1 are what make these read as light sources; PMREM renders to
  // a half-float target, so the headroom survives.
  material.color.setScalar(intensity);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

export function createStudioEnvironment(): THREE.Scene {
  const scene = new THREE.Scene();
  const geometry = panelGeometry();

  // The gaps. Everything not covered by a panel below falls back to this, and
  // it has to stay well under the panels or there is no edge for a facet to
  // straddle. This is the value a "dark" facet returns.
  const room = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
  room.material.color.setScalar(0.22);
  room.scale.set(24, 14, 24);
  scene.add(room);

  // The panels. Large on purpose — a facet mirrors a narrow cone, so a source
  // only registers if it covers real solid angle. Together these cover roughly
  // half of all directions, which is what keeps the stone bright.
  scene.add(panel(geometry, 8, [0, 6.4, 0], [15, 0.5, 11])); // overhead key
  scene.add(panel(geometry, 5.5, [-8, 2.2, 2], [0.5, 6.5, 13])); // left wall
  scene.add(panel(geometry, 3.6, [8, 1.2, -1.5], [0.5, 6, 12])); // right wall, cooler
  scene.add(panel(geometry, 4.5, [0, 0.5, -9], [14, 5, 0.5])); // back wall
  scene.add(panel(geometry, 2.4, [0, -6, 0], [14, 0.5, 14])); // floor bounce

  // Deliberate holes punched through the panels above. Cutting a dark band into
  // a large source is what gives the stone hard light/dark boundaries to break
  // across, rather than one smooth gradient.
  scene.add(panel(geometry, 0.1, [0, 6.2, 2.4], [15.4, 0.7, 1.8]));
  scene.add(panel(geometry, 0.1, [-7.7, 2.0, -2.5], [0.8, 6.8, 2.2]));
  scene.add(panel(geometry, 0.12, [0, 1.2, -8.6], [3.2, 5.4, 0.9]));

  // Hot accents. Small and very bright: these are the pinpoint flashes on the
  // crown and the glints along the prongs, sitting on top of the broad
  // structure above rather than doing its job.
  const SPARKS = 10;
  for (let i = 0; i < SPARKS; i++) {
    const angle = (i / SPARKS) * Math.PI * 2 + (i % 3) * 0.41;
    const radius = 5.6 + (i % 4) * 0.8;
    const height = -2.8 + ((i * 5) % 9) * 1.05;
    // Deliberately uneven; a regular ring of these would strobe as it rotates.
    const intensity = 30 + ((i * 7) % 5) * 16;
    const size = 0.5 + ((i * 3) % 4) * 0.18;
    scene.add(
      panel(
        geometry,
        intensity,
        [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
        [size, size, size],
      ),
    );
  }

  return scene;
}

/**
 * A second rig, for the stones only.
 *
 * Metal and gems want opposite environments, and trying to serve both from one
 * scene is why the stones kept landing either blown-out white or grey. Metal
 * integrates the environment through a BRDF, so it wants the balanced rig above
 * and the gold looks right under it. A gem mirrors the environment directly and
 * one-to-one, and a real diamond reads *predominantly bright* — mostly light
 * facets with a minority of dark ones.
 *
 * So this inverts the construction: the base is bright and the *dark* elements
 * are what gets added, rather than the other way round.
 */
export function createGemEnvironment(): THREE.Scene {
  const scene = new THREE.Scene();
  const geometry = panelGeometry();

  // Bright tent. This is the value a typical facet returns, so it sets how
  // light the stone reads overall.
  const room = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
  room.material.color.setScalar(3.2);
  room.scale.set(24, 14, 24);
  scene.add(room);

  // Brighter still overhead and to one side, so the stone is not evenly lit.
  scene.add(panel(geometry, 9, [0, 6.4, 0], [15, 0.5, 12]));
  scene.add(panel(geometry, 6, [-8, 2, 1], [0.5, 7, 14]));

  // Dark patches — the contrast structure. Without something genuinely dark for
  // facets to land on there are no dark facets, and a stone with no dark facets
  // is a white blob however bright it is.
  //
  // Many small patches spread over the whole sphere, not a few big slabs. The
  // total dark fraction is what a raycast of this scene measures (a diamond
  // wants roughly a fifth of directions dark; at 40% it goes black), but the
  // *distribution* matters just as much. Concentrating the dark into a back
  // wall and a floor biases it directionally: a large stone whose facets happen
  // to bounce that way lands almost entirely in shadow, which is how the centre
  // stone ended up black while the melee stayed bright. Scattering them means
  // no facet orientation is systematically unlucky.
  const PATCHES = 16;
  for (let i = 0; i < PATCHES; i++) {
    const angle = (i / PATCHES) * Math.PI * 2 + (i % 5) * 0.29;
    const radius = 9.2;
    const height = -5.6 + ((i * 7) % 13) * 0.95;
    const size = 1.6 + ((i * 3) % 4) * 0.5;
    scene.add(
      panel(
        geometry,
        0.05,
        [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
        [size, size, size],
      ),
    );
  }
  // A couple on the ceiling and floor so the poles are not uniformly lit either.
  scene.add(panel(geometry, 0.06, [2.5, 6.5, 3], [3.5, 0.6, 3.5]));
  scene.add(panel(geometry, 0.06, [-3, -6.6, -2], [4, 0.6, 4]));

  // Hot pinpoints for scintillation; these clip to white on purpose.
  const SPARKS = 12;
  for (let i = 0; i < SPARKS; i++) {
    const angle = (i / SPARKS) * Math.PI * 2 + (i % 3) * 0.41;
    const radius = 5.6 + (i % 4) * 0.8;
    const height = -2.8 + ((i * 5) % 9) * 1.05;
    const intensity = 34 + ((i * 7) % 5) * 16;
    const size = 0.55 + ((i * 3) % 4) * 0.2;
    scene.add(
      panel(
        geometry,
        intensity,
        [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
        [size, size, size],
      ),
    );
  }

  return scene;
}

export interface EnvironmentTextures {
  /** Prefiltered, for the PBR metal. */
  pbr: THREE.Texture;
  /** Sharp cubemap, for the gem shader's own refraction and reflection. */
  gem: THREE.CubeTexture;
}

/**
 * Build both environment maps from one pass over the studio scene.
 *
 * The metal wants the prefiltered PMREM (roughness-aware, pre-blurred). The
 * gems want the opposite — a sharp cubemap they can sample along a refracted
 * ray, because blurring is exactly what would smear the facet flashes away.
 */
export function createEnvironmentTextures(renderer: THREE.WebGLRenderer): EnvironmentTextures {
  const environment = createStudioEnvironment();
  const gemEnvironment = createGemEnvironment();

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const pbr = pmrem.fromScene(environment, 0.02).texture;
  pmrem.dispose();

  // Mipmaps are deliberately OFF, and this matters more than it looks.
  //
  // `textureCube` picks its mip level from the screen-space derivative of the
  // sample direction. On a faceted gem that direction swings violently between
  // neighbouring pixels — that swing is the whole point of the effect, and the
  // internal bounces amplify it further — so the derivative is enormous and the
  // GPU selects a very coarse mip. At that level the cubemap is blurred to
  // nearly its average colour, so every facet returns the same value and the
  // stone renders as one flat white blob, no matter how the lighting is
  // arranged. Melee is worst hit, since each stone covers only a few pixels.
  //
  // With a single level there is no mip to choose and the samples stay sharp.
  // The cost is some shimmer on tiny facets as the ring turns, which reads as
  // scintillation rather than as an artefact.
  const cubeTarget = new THREE.WebGLCubeRenderTarget(512, {
    type: THREE.HalfFloatType,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  // Tone mapping MUST be off while baking this.
  //
  // CubeCamera renders with whatever settings the renderer currently has, and
  // MeshBasicMaterial is tone mapped by default — so the rig's HDR values (a
  // 3.2 room, 6-9 panels, 30-78 accents) get compressed into 0..1 on the way
  // into the cubemap. Every one of them lands near 1.0, the contrast the gem
  // shader exists to sample is destroyed before it ever runs, and the stone
  // renders flat: near-white at a high gain, near-black at a low one. No amount
  // of relighting or regrading can recover it, because the range is already
  // gone. PMREMGenerator does this internally, which is why the metal map was
  // never affected; CubeCamera leaves it to the caller.
  const previousToneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  new THREE.CubeCamera(0.1, 100, cubeTarget).update(renderer, gemEnvironment);
  renderer.toneMapping = previousToneMapping;

  // The source scenes are scaffolding; only the two maps outlive this call.
  const dispose = (scene: THREE.Scene) =>
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  dispose(environment);
  dispose(gemEnvironment);

  return { pbr, gem: cubeTarget.texture };
}
