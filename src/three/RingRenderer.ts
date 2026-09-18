/**
 * Imperative three.js scene for the ring viewer.
 *
 * Deliberately framework-free: React owns when this is created, told about new
 * assets and destroyed, and nothing else. Keeping the render loop out of React
 * means a metal change never re-runs an effect that could tear down the canvas.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { loadEnvironmentTextures, type EnvironmentTextures } from "./studioEnvironment";
import type { Metal, ViewName } from "@/types/ring";
import { applyMetalColor, createMetal, MATERIAL_TUNING } from "./ringMaterials";
import { createGemMaterial } from "./GemMaterial";
import { captureNormals, pruneNormalCaptures } from "./diamondNormalCapture";
import {
  cachedGeometryIds,
  loadPartGeometry,
  pruneGeometryCache,
  type RingPartSource,
} from "./ringGeometry";

export type ViewerMode = "360" | "engraving" | ViewName;

/**
 * Every ring is rescaled so its largest dimension is exactly this many world
 * units. The source models are in metres — a band measures about 0.021 across —
 * which would sit inside the default camera near plane and makes any hand-tuned
 * constant (thickness, distance, damping) meaningless. Normalising once here
 * lets every other number in this file be a plain readable value.
 */
const MODEL_SIZE = 2;

/** Camera framing per UI mode: azimuth/polar in degrees, plus a zoom multiplier. */
const CAMERA_PRESETS: Record<ViewerMode, { azimuth: number; polar: number; zoom: number }> = {
  "360": { azimuth: 35, polar: 72, zoom: 1 },
  angle: { azimuth: 35, polar: 72, zoom: 1 },
  front: { azimuth: 0, polar: 72, zoom: 1 },
  side: { azimuth: 90, polar: 72, zoom: 1 },
  top: { azimuth: 0, polar: 18, zoom: 1 },
  // The engraving sits on the inner face of the band, so move in close.
  engraving: { azimuth: 90, polar: 72, zoom: 0.62 },
};

/**
 * Cube resolution for the trace map baked off each stone.
 *
 * The centre stone is the hero and fills a good part of the frame, so it gets a
 * full capture. Melee is half a millimetre across and covers a few pixels; at
 * 128 a pavé rail of 20 stones costs ~16 MB of VRAM instead of ~250 MB, and at
 * that size on screen nothing is lost.
 */
const CENTER_CAPTURE_SIZE = 512;
const ACCENT_CAPTURE_SIZE = 128;

export class RingRenderer {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly ring = new THREE.Group();
  private readonly environment: EnvironmentTextures;
  private readonly resizeObserver: ResizeObserver;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;

  private readonly metalMaterials: THREE.MeshPhysicalMaterial[] = [];
  private readonly liveMaterials: THREE.Material[] = [];
  /** Stone meshes whose trace uniforms track their world matrix. */
  private readonly gemMeshes: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];

  private metal: Metal;
  private mode: ViewerMode = "360";
  private frameRadius = 1;
  private readonly targetPosition = new THREE.Vector3();
  private settlingCamera = false;
  private userHasInteracted = false;
  private running = true;
  private disposed = false;
  private animationHandle = 0;
  /** Bumped on every setParts call so a superseded load can bail out. */
  private generation = 0;

  /**
   * The environment maps are fetched, so construction is async. Everything
   * downstream depends on them — the metal cannot be lit and a stone cannot be
   * traced without one — so there is no useful partially-built state.
   */
  static async create(container: HTMLElement, metal: Metal): Promise<RingRenderer> {
    const environment = await loadEnvironmentTextures();
    return new RingRenderer(container, metal, environment);
  }

  private constructor(container: HTMLElement, metal: Metal, environment: EnvironmentTextures) {
    this.container = container;
    this.metal = metal;
    this.environment = environment;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearAlpha(0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES, applied once at the end of the chain by OutputPass. The gem shader
    // deliberately returns values well above 1 — a facet catching a light source
    // is genuinely brighter than white — and a film curve is what turns that
    // range into highlights instead of flat clipped patches.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.className = "glb-model";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, 6);

    // Image-based lighting does all the work here: the metal integrates the
    // prefiltered studio capture through three's PBR shader, and each stone
    // traces rays against the gem capture through its own.
    this.scene.environment = environment.metal;
    this.scene.add(this.ring);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.85;
    this.controls.autoRotateSpeed = 1.1;
    this.controls.addEventListener("start", () => {
      this.userHasInteracted = true;
      this.settlingCamera = false;
    });

    // Half-float, so the stones' above-white output survives to the bloom pass
    // instead of clipping on the way in.
    this.composer = new EffectComposer(
      this.renderer,
      new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }),
    );
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Threshold 1 on purpose: only what is brighter than white blooms, which on
    // this scene is exactly the facet flashes and the specular on the prongs.
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 1);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.animationHandle = requestAnimationFrame(this.tick);
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);

    this.applyCameraPreset(true);
  }

  /**
   * Replace the model. Resolves once the new ring is on screen, or immediately
   * and silently if a newer setParts call has already superseded this one.
   */
  async setParts(parts: RingPartSource[]): Promise<void> {
    const generation = ++this.generation;
    const loaded = await Promise.all(parts.map((part) => loadPartGeometry(part.url, part.role)));
    if (this.disposed || generation !== this.generation) return;

    this.clearRing();

    const envIntensity = MATERIAL_TUNING.metalEnvIntensity;

    const group = new THREE.Group();
    parts.forEach((part, index) => {
      const entry = loaded[index];
      if (!entry) return;
      const role = part.role;
      for (const piece of entry.pieces) {
        if (role === "metal") {
          const material = createMetal(this.metal, envIntensity);
          this.liveMaterials.push(material);
          this.metalMaterials.push(material);
          const mesh = new THREE.Mesh(piece.geometry, material);
          // The node transform lives here rather than in the attribute buffers;
          // see RingPartPiece for why baking it would destroy the quantised metal.
          mesh.applyMatrix4(piece.matrix);
          group.add(mesh);
          continue;
        }

        const material = createGemMaterial(role, this.environment.gem);
        this.liveMaterials.push(material);
        const mesh = new THREE.Mesh(piece.geometry, material);
        mesh.applyMatrix4(piece.matrix);
        this.prepareGem(mesh, role);
        group.add(mesh);
      }
    });

    // Normalise: recentre on the union bounds and scale to MODEL_SIZE. Done on
    // the union rather than per part so head and band keep their alignment.
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z) || 1;
    const scale = MODEL_SIZE / largest;
    group.position.copy(center).multiplyScalar(-scale);
    group.scale.setScalar(scale);

    this.ring.add(group);
    this.frameRadius = (bounds.getBoundingSphere(new THREE.Sphere()).radius || 1) * scale;

    // The trace runs in each stone's own space, so every gem needs the matrix
    // that gets it there — and that is only final once the group above has been
    // placed and scaled.
    this.scene.updateMatrixWorld(true);
    this.syncGemMatrices();

    pruneGeometryCache(parts.map((part) => part.url));
    pruneNormalCaptures(cachedGeometryIds());
    this.applyCameraPreset(true);
  }

  /**
   * Bake this stone's surface into its trace cubemap and point the material at
   * it. A failed capture is not fatal: the stone still draws, using whatever
   * the shader's fallback direction returns.
   */
  private prepareGem(
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>,
    role: "centerStone" | "accentStone",
  ): void {
    const size = role === "centerStone" ? CENTER_CAPTURE_SIZE : ACCENT_CAPTURE_SIZE;
    try {
      const capture = captureNormals(this.renderer, mesh.geometry, size);
      const uniforms = mesh.material.uniforms;
      uniforms["tCubeMapNormals"]!.value = capture.texture;
      uniforms["radius"]!.value = capture.radius;
      (uniforms["centerOffset"]!.value as THREE.Vector3).copy(capture.centerOffset);
      this.gemMeshes.push(mesh);
    } catch (error) {
      console.warn("Diamond normal capture failed", error);
    }
  }

  /** Push each stone's world matrix (and its inverse) into its trace uniforms. */
  private syncGemMatrices(): void {
    for (const mesh of this.gemMeshes) {
      const uniforms = mesh.material.uniforms;
      (uniforms["modelOffsetMatrix"]!.value as THREE.Matrix4).copy(mesh.matrixWorld);
      (uniforms["modelOffsetMatrixInv"]!.value as THREE.Matrix4).copy(mesh.matrixWorld).invert();
    }
  }

  /** Dispose meshes and materials, but not geometry — that belongs to the cache. */
  private clearRing(): void {
    this.ring.clear();
    this.liveMaterials.forEach((material) => material.dispose());
    this.liveMaterials.length = 0;
    this.metalMaterials.length = 0;
    this.gemMeshes.length = 0;
  }

  setMetal(metal: Metal): void {
    if (metal === this.metal) return;
    this.metal = metal;
    this.metalMaterials.forEach((material) => applyMetalColor(material, metal));
  }

  setMode(mode: ViewerMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    // An explicit view choice overrides a previous manual drag.
    this.userHasInteracted = false;
    this.applyCameraPreset(false);
  }

  /**
   * Point the camera at the preset for the current mode. `immediate` snaps
   * (first load, resize); otherwise the loop eases across so switching views
   * reads as a move rather than a cut.
   */
  private applyCameraPreset(immediate: boolean): void {
    const preset = CAMERA_PRESETS[this.mode];
    // Distance that fits the bounding sphere in the vertical *and* horizontal
    // field of view — without the aspect term a narrow container crops the ring.
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fit = this.frameRadius / Math.sin(Math.min(vFov, hFov) / 2);
    const distance = (fit * 1.12) / preset.zoom;

    const spherical = new THREE.Spherical(
      distance,
      THREE.MathUtils.degToRad(preset.polar),
      THREE.MathUtils.degToRad(preset.azimuth),
    );
    this.targetPosition.setFromSpherical(spherical);

    this.controls.minDistance = distance * 0.45;
    this.controls.maxDistance = distance * 2.2;

    if (immediate || this.userHasInteracted) {
      this.camera.position.copy(this.targetPosition);
      this.settlingCamera = false;
    } else {
      this.settlingCamera = true;
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /** Pause the loop when the canvas is offscreen or the tab is hidden. */
  setRunning(running: boolean): void {
    this.running = running;
  }

  private readonly tick = (): void => {
    this.animationHandle = requestAnimationFrame(this.tick);
    if (!this.running || this.disposed) return;

    if (this.settlingCamera) {
      this.camera.position.lerp(this.targetPosition, 0.12);
      if (this.camera.position.distanceTo(this.targetPosition) < this.frameRadius * 0.002) {
        this.camera.position.copy(this.targetPosition);
        this.settlingCamera = false;
      }
    }

    this.controls.autoRotate =
      this.mode === "360" && !this.userHasInteracted && !this.settlingCamera;
    this.controls.update();
    this.composer.render();
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationHandle);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.clearRing();
    this.bloomPass.dispose();
    this.composer.dispose();
    // The environment textures are shared across viewers and cached for the
    // life of the page, so they are deliberately not disposed here.
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
